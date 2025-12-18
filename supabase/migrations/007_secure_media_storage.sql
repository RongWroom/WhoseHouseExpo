-- 007_secure_media_storage.sql
-- Secure media storage with encryption and access control

-- Create storage buckets for different media types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('case-media', 'case-media', false, 10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']),
  ('profile-photos', 'profile-photos', false, 5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create media metadata table
CREATE TABLE IF NOT EXISTS media_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name TEXT NOT NULL,
  object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  case_id UUID REFERENCES cases(id),
  media_type TEXT NOT NULL CHECK (media_type IN ('house_photo', 'profile_photo', 'document', 'other')),
  description TEXT,
  is_encrypted BOOLEAN DEFAULT true,
  encryption_key_id TEXT, -- Reference to key management system
  checksum TEXT NOT NULL, -- SHA-256 hash for integrity verification
  metadata JSONB DEFAULT '{}',
  retention_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete for audit trail
  UNIQUE(bucket_name, object_path)
);

-- Create indexes for performance
CREATE INDEX idx_media_metadata_case_id ON media_metadata(case_id);
CREATE INDEX idx_media_metadata_uploaded_by ON media_metadata(uploaded_by);
CREATE INDEX idx_media_metadata_created_at ON media_metadata(created_at DESC);
CREATE INDEX idx_media_metadata_retention ON media_metadata(retention_expires_at) 
  WHERE retention_expires_at IS NOT NULL;

-- Helper trigger function to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Media access control table
CREATE TABLE IF NOT EXISTS media_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media_metadata(id) ON DELETE CASCADE,
  granted_to UUID REFERENCES profiles(id),
  granted_by UUID REFERENCES profiles(id),
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'download', 'delete')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(media_id, granted_to, access_level)
);

CREATE INDEX idx_media_access_media_id ON media_access(media_id);
CREATE INDEX idx_media_access_granted_to ON media_access(granted_to);

-- Media viewing audit log
CREATE TABLE IF NOT EXISTS media_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media_metadata(id),
  action TEXT NOT NULL CHECK (action IN ('upload', 'view', 'download', 'delete', 'access_granted', 'access_revoked')),
  performed_by UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_audit_log_media_id ON media_audit_log(media_id);
CREATE INDEX idx_media_audit_log_performed_by ON media_audit_log(performed_by);
CREATE INDEX idx_media_audit_log_created_at ON media_audit_log(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE media_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_metadata

-- Social workers can view media for their cases
CREATE POLICY "social_workers_view_case_media" ON media_metadata
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      WHERE p.role = 'social_worker'
      AND (
        -- Media for their cases
        media_metadata.case_id IN (
          SELECT c.id FROM cases c WHERE c.social_worker_id = p.id
        )
        -- Or their own uploads
        OR media_metadata.uploaded_by = p.id
        -- Or explicitly granted access
        OR EXISTS (
          SELECT 1 FROM media_access ma
          WHERE ma.media_id = media_metadata.id
          AND ma.granted_to = p.id
          AND ma.revoked_at IS NULL
          AND (ma.expires_at IS NULL OR ma.expires_at > NOW())
        )
      )
    )
  );

-- Foster carers can view media for their active case
CREATE POLICY "foster_carers_view_case_media" ON media_metadata
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      WHERE p.role = 'foster_carer'
      AND (
        -- Media for their active case
        media_metadata.case_id IN (
          SELECT c.id FROM cases c 
          WHERE c.foster_carer_id = p.id
          AND c.status = 'active'
        )
        -- Or their own uploads
        OR media_metadata.uploaded_by = p.id
        -- Or explicitly granted access
        OR EXISTS (
          SELECT 1 FROM media_access ma
          WHERE ma.media_id = media_metadata.id
          AND ma.granted_to = p.id
          AND ma.revoked_at IS NULL
          AND (ma.expires_at IS NULL OR ma.expires_at > NOW())
        )
      )
    )
  );

-- Only social workers can upload media
CREATE POLICY "social_workers_upload_media" ON media_metadata
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = 'social_worker'
      AND id = auth.uid()
    )
  );

-- Only the uploader or admin can delete (soft delete)
CREATE POLICY "media_delete_policy" ON media_metadata
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE (id = media_metadata.uploaded_by OR role = 'admin')
      AND id = auth.uid()
    )
  );

-- RLS Policies for media_access

-- Only social workers and admins can grant access
CREATE POLICY "grant_media_access_policy" ON media_access
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('social_worker', 'admin')
      AND id = auth.uid()
    )
  );

-- View access grants
CREATE POLICY "view_media_access_policy" ON media_access
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE id = media_access.granted_to
      OR id = media_access.granted_by
      OR role = 'admin'
    )
  );

-- RLS Policies for media_audit_log (read-only for authorized users)
CREATE POLICY "view_media_audit_log_policy" ON media_audit_log
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role IN ('social_worker', 'admin')
    )
  );

-- Storage bucket policies

-- Case media bucket policies
CREATE POLICY "case_media_upload_policy" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'case-media' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'social_worker'
    )
  );

CREATE POLICY "case_media_view_policy" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'case-media' AND
    EXISTS (
      SELECT 1 FROM media_metadata mm
      WHERE mm.bucket_name = 'case-media'
      AND mm.object_path = storage.objects.name
      AND (
        -- Check if user has access through media_metadata policies
        mm.uploaded_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM media_access ma
          WHERE ma.media_id = mm.id
          AND ma.granted_to = auth.uid()
          AND ma.revoked_at IS NULL
          AND (ma.expires_at IS NULL OR ma.expires_at > NOW())
        )
        OR auth.uid() IN (
          SELECT p.id FROM profiles p
          WHERE p.role = 'social_worker'
          AND mm.case_id IN (
            SELECT c.id FROM cases c WHERE c.social_worker_id = p.id
          )
        )
      )
    )
  );

-- Profile photos bucket policies
CREATE POLICY "profile_photo_upload_policy" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_photo_view_policy" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'profile-photos'
  );

-- Functions for secure media operations

-- Function to upload media with metadata
CREATE OR REPLACE FUNCTION upload_media_with_metadata(
  p_bucket_name TEXT,
  p_object_path TEXT,
  p_file_name TEXT,
  p_mime_type TEXT,
  p_file_size INTEGER,
  p_case_id UUID,
  p_media_type TEXT,
  p_description TEXT,
  p_checksum TEXT,
  p_retention_days INTEGER DEFAULT 180
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_media_id UUID;
  v_retention_expires TIMESTAMPTZ;
BEGIN
  -- Check if user is a social worker
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'social_worker'
  ) THEN
    RAISE EXCEPTION 'Only social workers can upload media';
  END IF;
  
  -- Calculate retention expiry
  IF p_retention_days IS NOT NULL THEN
    v_retention_expires := NOW() + (p_retention_days || ' days')::INTERVAL;
  END IF;
  
  -- Insert media metadata
  INSERT INTO media_metadata (
    bucket_name, object_path, file_name, mime_type, file_size,
    uploaded_by, case_id, media_type, description, checksum,
    retention_expires_at
  ) VALUES (
    p_bucket_name, p_object_path, p_file_name, p_mime_type, p_file_size,
    auth.uid(), p_case_id, p_media_type, p_description, p_checksum,
    v_retention_expires
  ) RETURNING id INTO v_media_id;
  
  -- Log the upload
  INSERT INTO media_audit_log (media_id, action, performed_by, metadata)
  VALUES (
    v_media_id, 'upload', auth.uid(),
    jsonb_build_object(
      'file_name', p_file_name,
      'file_size', p_file_size,
      'case_id', p_case_id
    )
  );
  
  -- Also log in main audit table
  INSERT INTO audit_logs (action, user_id, resource_type, resource_id, metadata)
  VALUES (
    'media.upload', auth.uid(), 'media', v_media_id,
    jsonb_build_object(
      'file_name', p_file_name,
      'case_id', p_case_id,
      'media_type', p_media_type
    )
  );
  
  RETURN v_media_id;
END;
$$;

-- Function to grant media access
CREATE OR REPLACE FUNCTION grant_media_access(
  p_media_id UUID,
  p_user_id UUID,
  p_access_level TEXT,
  p_expires_in_hours INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Check if user can grant access
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('social_worker', 'admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to grant media access';
  END IF;
  
  -- Calculate expiry
  IF p_expires_in_hours IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
  END IF;
  
  -- Insert or update access grant
  INSERT INTO media_access (
    media_id, granted_to, granted_by, access_level, expires_at
  ) VALUES (
    p_media_id, p_user_id, auth.uid(), p_access_level, v_expires_at
  )
  ON CONFLICT (media_id, granted_to, access_level) 
  DO UPDATE SET 
    expires_at = EXCLUDED.expires_at,
    revoked_at = NULL
  RETURNING id INTO v_access_id;
  
  -- Log the access grant
  INSERT INTO media_audit_log (media_id, action, performed_by, metadata)
  VALUES (
    p_media_id, 'access_granted', auth.uid(),
    jsonb_build_object(
      'granted_to', p_user_id,
      'access_level', p_access_level,
      'expires_at', v_expires_at
    )
  );
  
  RETURN v_access_id;
END;
$$;

-- Function to log media view/download
CREATE OR REPLACE FUNCTION log_media_access(
  p_media_id UUID,
  p_action TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert audit log entry
  INSERT INTO media_audit_log (
    media_id, action, performed_by, ip_address, user_agent
  ) VALUES (
    p_media_id, p_action, auth.uid(), p_ip_address, p_user_agent
  );
  
  -- Also log in main audit table for critical actions
  IF p_action IN ('download', 'delete') THEN
    INSERT INTO audit_logs (action, user_id, resource_type, resource_id)
    VALUES (
      'media.' || p_action, auth.uid(), 'media', p_media_id
    );
  END IF;
END;
$$;

-- Function to clean up expired media
CREATE OR REPLACE FUNCTION cleanup_expired_media()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_media RECORD;
BEGIN
  -- Find and process expired media
  FOR v_media IN 
    SELECT id, bucket_name, object_path 
    FROM media_metadata
    WHERE retention_expires_at < NOW()
    AND deleted_at IS NULL
  LOOP
    -- Mark as deleted in metadata
    UPDATE media_metadata
    SET deleted_at = NOW()
    WHERE id = v_media.id;
    
    -- Note: Actual file deletion from storage should be handled
    -- by a separate process with proper verification
    
    v_deleted_count := v_deleted_count + 1;
    
    -- Log the cleanup
    INSERT INTO media_audit_log (media_id, action, performed_by, metadata)
    VALUES (
      v_media.id, 'delete', NULL,
      jsonb_build_object('reason', 'retention_expired')
    );
  END LOOP;
  
  RETURN v_deleted_count;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_media_metadata_updated_at
  BEFORE UPDATE ON media_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION upload_media_with_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION grant_media_access TO authenticated;
GRANT EXECUTE ON FUNCTION log_media_access TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_media TO service_role;
