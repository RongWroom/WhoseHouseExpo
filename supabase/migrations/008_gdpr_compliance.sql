-- 008_gdpr_compliance.sql
-- GDPR compliance features including consent tracking, data export, and retention policies

-- User consent tracking table
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'data_processing',
    'communication',
    'media_sharing',
    'analytics',
    'marketing'
  )),
  granted BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- Data export requests table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('gdpr_export', 'data_portability', 'audit_trail')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  export_url TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  error_message TEXT
);

CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);

-- Data deletion requests table (Right to be forgotten)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('full_account', 'messages_only', 'media_only', 'case_data')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- Grace period
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_data_deletion_requests_scheduled ON data_deletion_requests(scheduled_for);

-- Privacy preferences table
CREATE TABLE IF NOT EXISTS privacy_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  show_profile_photo BOOLEAN DEFAULT true,
  show_online_status BOOLEAN DEFAULT true,
  allow_message_notifications BOOLEAN DEFAULT true,
  allow_case_notifications BOOLEAN DEFAULT true,
  data_retention_preference TEXT CHECK (data_retention_preference IN ('minimum', 'standard', 'maximum')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL UNIQUE CHECK (data_type IN (
    'messages',
    'media',
    'audit_logs',
    'case_data',
    'access_logs',
    'consent_records'
  )),
  retention_days INTEGER NOT NULL,
  legal_basis TEXT,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT false, -- Some data must be kept for legal reasons
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (data_type, retention_days, legal_basis, description, is_mandatory) VALUES
  ('messages', 365, 'Legitimate interest', 'Messages retained for 1 year for safeguarding purposes', false),
  ('media', 180, 'Legitimate interest', 'Media files retained for 6 months', false),
  ('audit_logs', 2555, 'Legal requirement', 'Audit logs retained for 7 years per UK regulations', true),
  ('case_data', 1825, 'Legal requirement', 'Case data retained for 5 years after case closure', true),
  ('access_logs', 90, 'Security', 'Access logs retained for 90 days for security monitoring', false),
  ('consent_records', 2555, 'Legal requirement', 'Consent records retained for 7 years', true)
ON CONFLICT (data_type) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can manage their own consents
CREATE POLICY "users_manage_own_consents" ON user_consents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all consents
CREATE POLICY "admins_view_all_consents" ON user_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users can request their own data exports
CREATE POLICY "users_request_own_exports" ON data_export_requests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can request deletion of their own data
CREATE POLICY "users_request_own_deletion" ON data_deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_view_own_deletion_requests" ON data_deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can approve/reject deletion requests
CREATE POLICY "admins_manage_deletion_requests" ON data_deletion_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users can manage their own privacy preferences
CREATE POLICY "users_manage_own_privacy" ON privacy_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Everyone can view retention policies
CREATE POLICY "public_view_retention_policies" ON data_retention_policies
  FOR SELECT
  USING (true);

-- Only admins can modify retention policies
CREATE POLICY "admins_manage_retention_policies" ON data_retention_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- GDPR compliance functions

-- Function to record user consent
CREATE OR REPLACE FUNCTION record_user_consent(
  p_consent_type TEXT,
  p_granted BOOLEAN,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consent_id UUID;
  v_timestamp TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO user_consents (
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_consent_type,
    p_granted,
    CASE WHEN p_granted THEN v_timestamp ELSE NULL END,
    CASE WHEN NOT p_granted THEN v_timestamp ELSE NULL END,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, consent_type) 
  DO UPDATE SET
    granted = EXCLUDED.granted,
    granted_at = CASE WHEN EXCLUDED.granted THEN v_timestamp ELSE user_consents.granted_at END,
    revoked_at = CASE WHEN NOT EXCLUDED.granted THEN v_timestamp ELSE NULL END,
    consent_version = '1.0',
    updated_at = v_timestamp
  RETURNING id INTO v_consent_id;
  
  -- Audit log
  INSERT INTO audit_logs (action, user_id, resource_type, resource_id, metadata)
  VALUES (
    CASE WHEN p_granted THEN 'consent.granted' ELSE 'consent.revoked' END,
    auth.uid(),
    'consent',
    v_consent_id,
    jsonb_build_object('consent_type', p_consent_type)
  );
  
  RETURN v_consent_id;
END;
$$;

-- Function to request data export
CREATE OR REPLACE FUNCTION request_data_export(
  p_request_type TEXT DEFAULT 'gdpr_export'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM data_export_requests
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'You already have a pending export request';
  END IF;
  
  INSERT INTO data_export_requests (
    user_id,
    request_type,
    status
  ) VALUES (
    auth.uid(),
    p_request_type,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Audit log
  INSERT INTO audit_logs (action, user_id, resource_type, resource_id)
  VALUES ('data.export_requested', auth.uid(), 'export_request', v_request_id);
  
  -- Trigger async export process (would be handled by a background job)
  PERFORM pg_notify('data_export_requested', json_build_object(
    'request_id', v_request_id,
    'user_id', auth.uid()
  )::text);
  
  RETURN v_request_id;
END;
$$;

-- Function to request data deletion
CREATE OR REPLACE FUNCTION request_data_deletion(
  p_deletion_type TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM data_deletion_requests
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'approved', 'processing')
  ) THEN
    RAISE EXCEPTION 'You already have a pending deletion request';
  END IF;
  
  INSERT INTO data_deletion_requests (
    user_id,
    deletion_type,
    reason,
    status
  ) VALUES (
    auth.uid(),
    p_deletion_type,
    p_reason,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Audit log
  INSERT INTO audit_logs (action, user_id, resource_type, resource_id, metadata)
  VALUES (
    'data.deletion_requested',
    auth.uid(),
    'deletion_request',
    v_request_id,
    jsonb_build_object('deletion_type', p_deletion_type)
  );
  
  RETURN v_request_id;
END;
$$;

-- Function to collect all user data for export
CREATE OR REPLACE FUNCTION collect_user_data_for_export(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_data JSONB;
BEGIN
  -- Only allow users to export their own data or admins to export any
  IF p_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized to export this user''s data';
  END IF;
  
  SELECT jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) - 'password_hash' -- Exclude sensitive fields
      FROM profiles p
      WHERE p.id = p_user_id
    ),
    'messages', (
      SELECT jsonb_agg(to_jsonb(m))
      FROM messages m
      WHERE m.sender_id = p_user_id 
      OR m.recipient_id = p_user_id
    ),
    'cases', (
      SELECT jsonb_agg(to_jsonb(c) - 'internal_notes') -- Exclude internal notes
      FROM cases c
      WHERE c.child_id = p_user_id 
      OR c.social_worker_id = p_user_id
      OR c.foster_carer_id = p_user_id
    ),
    'media', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', mm.id,
        'file_name', mm.file_name,
        'media_type', mm.media_type,
        'uploaded_at', mm.created_at
      ))
      FROM media_metadata mm
      WHERE mm.uploaded_by = p_user_id
    ),
    'consents', (
      SELECT jsonb_agg(to_jsonb(uc))
      FROM user_consents uc
      WHERE uc.user_id = p_user_id
    ),
    'privacy_preferences', (
      SELECT to_jsonb(pp)
      FROM privacy_preferences pp
      WHERE pp.user_id = p_user_id
    ),
    'export_timestamp', NOW(),
    'export_version', '1.0'
  ) INTO v_user_data;
  
  RETURN v_user_data;
END;
$$;

-- Function to anonymize user data (soft delete with anonymization)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anonymous_id TEXT;
BEGIN
  -- Only admins can anonymize data
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can anonymize user data';
  END IF;
  
  -- Generate anonymous ID
  v_anonymous_id := 'ANON_' || gen_random_uuid()::TEXT;
  
  -- Anonymize profile
  UPDATE profiles
  SET 
    email = v_anonymous_id || '@anonymized.local',
    first_name = 'Anonymous',
    last_name = 'User',
    phone_number = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Anonymize messages content but keep for audit trail
  UPDATE messages
  SET 
    content = '[Message anonymized]',
    updated_at = NOW()
  WHERE sender_id = p_user_id OR recipient_id = p_user_id;
  
  -- Remove media metadata descriptions
  UPDATE media_metadata
  SET 
    description = NULL,
    updated_at = NOW()
  WHERE uploaded_by = p_user_id;
  
  -- Audit log
  INSERT INTO audit_logs (action, user_id, resource_type, resource_id)
  VALUES ('data.anonymized', auth.uid(), 'user', p_user_id);
END;
$$;

-- Function to check data retention compliance
CREATE OR REPLACE FUNCTION check_retention_compliance()
RETURNS TABLE (
  data_type TEXT,
  items_to_delete INTEGER,
  oldest_item_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH retention_check AS (
    SELECT 
      'messages' as type,
      COUNT(*) as count,
      MIN(created_at) as oldest
    FROM messages
    WHERE created_at < NOW() - (
      SELECT retention_days || ' days'::INTERVAL 
      FROM data_retention_policies 
      WHERE data_type = 'messages'
    )
    UNION ALL
    SELECT 
      'media' as type,
      COUNT(*) as count,
      MIN(created_at) as oldest
    FROM media_metadata
    WHERE created_at < NOW() - (
      SELECT retention_days || ' days'::INTERVAL 
      FROM data_retention_policies 
      WHERE data_type = 'media'
    )
    AND deleted_at IS NULL
  )
  SELECT 
    type::TEXT,
    count::INTEGER,
    oldest::TIMESTAMPTZ
  FROM retention_check
  WHERE count > 0;
END;
$$;

-- Function to apply retention policies (cleanup old data)
CREATE OR REPLACE FUNCTION apply_retention_policies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_counts JSONB := '{}';
  v_policy RECORD;
  v_count INTEGER;
BEGIN
  -- Only admins or system can run this
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can apply retention policies';
  END IF;
  
  FOR v_policy IN 
    SELECT * FROM data_retention_policies WHERE NOT is_mandatory
  LOOP
    CASE v_policy.data_type
      WHEN 'messages' THEN
        DELETE FROM messages
        WHERE created_at < NOW() - (v_policy.retention_days || ' days')::INTERVAL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_counts := v_deleted_counts || jsonb_build_object('messages', v_count);
        
      WHEN 'media' THEN
        UPDATE media_metadata
        SET deleted_at = NOW()
        WHERE created_at < NOW() - (v_policy.retention_days || ' days')::INTERVAL
        AND deleted_at IS NULL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_counts := v_deleted_counts || jsonb_build_object('media', v_count);
        
      WHEN 'access_logs' THEN
        DELETE FROM child_access_tokens
        WHERE created_at < NOW() - (v_policy.retention_days || ' days')::INTERVAL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_counts := v_deleted_counts || jsonb_build_object('access_logs', v_count);
    END CASE;
  END LOOP;
  
  -- Audit log
  INSERT INTO audit_logs (action, user_id, resource_type, metadata)
  VALUES (
    'retention.policies_applied',
    auth.uid(),
    'system',
    v_deleted_counts
  );
  
  RETURN v_deleted_counts;
END;
$$;

-- Create triggers
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_preferences_updated_at
  BEFORE UPDATE ON privacy_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION record_user_consent TO authenticated;
GRANT EXECUTE ON FUNCTION request_data_export TO authenticated;
GRANT EXECUTE ON FUNCTION request_data_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION collect_user_data_for_export TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION check_retention_compliance TO authenticated;
GRANT EXECUTE ON FUNCTION apply_retention_policies TO service_role;
