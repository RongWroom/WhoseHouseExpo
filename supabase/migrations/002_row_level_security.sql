-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a social worker
CREATE OR REPLACE FUNCTION public.is_social_worker()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_role() = 'social_worker';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a foster carer
CREATE OR REPLACE FUNCTION public.is_foster_carer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_role() = 'foster_carer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's organization
CREATE OR REPLACE FUNCTION public.user_organization()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Admins can view all organizations
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = public.user_organization());

-- Only admins can manage organizations
CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent role changes
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    -- Prevent organization changes
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Social workers can view profiles in their organization
CREATE POLICY "Social workers view org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.is_social_worker() AND 
    organization_id = public.user_organization()
  );

-- Admins can view all profiles in their organization
CREATE POLICY "Admins view all org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.is_admin() AND 
    organization_id = public.user_organization()
  );

-- Admins can manage profiles in their organization
CREATE POLICY "Admins manage org profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    public.is_admin() AND 
    organization_id = public.user_organization()
  )
  WITH CHECK (
    public.is_admin() AND 
    organization_id = public.user_organization()
  );

-- ============================================
-- CASES POLICIES
-- ============================================

-- Social workers can view cases assigned to them
CREATE POLICY "Social workers view assigned cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    public.is_social_worker() AND 
    social_worker_id = auth.uid()
  );

-- Foster carers can view their active case
CREATE POLICY "Foster carers view active case"
  ON cases FOR SELECT
  TO authenticated
  USING (
    public.is_foster_carer() AND 
    foster_carer_id = auth.uid() AND
    status = 'active'
  );

-- Social workers can create cases
CREATE POLICY "Social workers create cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_social_worker() AND
    social_worker_id = auth.uid()
  );

-- Social workers can update their assigned cases
CREATE POLICY "Social workers update assigned cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    public.is_social_worker() AND 
    social_worker_id = auth.uid()
  )
  WITH CHECK (
    public.is_social_worker() AND 
    social_worker_id = auth.uid()
  );

-- Admins can view all cases in their organization
CREATE POLICY "Admins view all org cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = cases.social_worker_id
      AND p.organization_id = public.user_organization()
    )
  );

-- ============================================
-- CHILD ACCESS TOKENS POLICIES
-- ============================================

-- Social workers can create tokens for their cases
CREATE POLICY "Social workers create case tokens"
  ON child_access_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id
      AND social_worker_id = auth.uid()
    ) AND
    created_by = auth.uid()
  );

-- Social workers can view tokens for their cases
CREATE POLICY "Social workers view case tokens"
  ON child_access_tokens FOR SELECT
  TO authenticated
  USING (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id
      AND social_worker_id = auth.uid()
    )
  );

-- Social workers can revoke tokens for their cases
CREATE POLICY "Social workers revoke case tokens"
  ON child_access_tokens FOR UPDATE
  TO authenticated
  USING (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id
      AND social_worker_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id
      AND social_worker_id = auth.uid()
    ) AND
    -- Can only change status to revoked
    status = 'revoked'
  );

-- Public access for token validation (anonymous children)
CREATE POLICY "Public token validation"
  ON child_access_tokens FOR SELECT
  TO anon
  USING (
    status = 'active' AND
    expires_at > NOW()
  );

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Users can view messages where they are sender or recipient
CREATE POLICY "Users view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid()
  );

-- Social workers can view all messages for their cases
CREATE POLICY "Social workers view case messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = messages.case_id
      AND social_worker_id = auth.uid()
    )
  );

-- Foster carers can view messages for their active case
CREATE POLICY "Foster carers view case messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    public.is_foster_carer() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = messages.case_id
      AND foster_carer_id = auth.uid()
      AND status = 'active'
    )
  );

-- Users can send messages (validated by trigger)
CREATE POLICY "Users send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    -- Additional validation happens in trigger
    (
      public.is_social_worker() OR 
      public.is_foster_carer()
    )
  );

-- Users can update their own sent messages (for status updates)
CREATE POLICY "Users update message status"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    recipient_id = auth.uid()
  )
  WITH CHECK (
    recipient_id = auth.uid() AND
    -- Can only update status fields
    sender_id = (SELECT sender_id FROM messages WHERE id = messages.id) AND
    content = (SELECT content FROM messages WHERE id = messages.id)
  );

-- Public policy for child messages via token
CREATE POLICY "Children send messages via token"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (
    child_token_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM child_access_tokens
      WHERE id = child_token_id
      AND status = 'active'
      AND expires_at > NOW()
    )
  );

-- Public policy for children to view their messages
CREATE POLICY "Children view own messages via token"
  ON messages FOR SELECT
  TO anon
  USING (
    child_token_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM child_access_tokens
      WHERE id = child_token_id
      AND status IN ('active', 'used')
    )
  );

-- ============================================
-- CASE MEDIA POLICIES
-- ============================================

-- Social workers can manage media for their cases
CREATE POLICY "Social workers manage case media"
  ON case_media FOR ALL
  TO authenticated
  USING (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_media.case_id
      AND social_worker_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_social_worker() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_media.case_id
      AND social_worker_id = auth.uid()
    )
  );

-- Foster carers can view media for their active case
CREATE POLICY "Foster carers view case media"
  ON case_media FOR SELECT
  TO authenticated
  USING (
    public.is_foster_carer() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_media.case_id
      AND foster_carer_id = auth.uid()
      AND status = 'active'
    )
  );

-- Foster carers can upload media for their active case
CREATE POLICY "Foster carers upload case media"
  ON case_media FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_foster_carer() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_media.case_id
      AND foster_carer_id = auth.uid()
      AND status = 'active'
    ) AND
    uploaded_by = auth.uid()
  );

-- Public access for child-visible media via token
CREATE POLICY "Children view approved media"
  ON case_media FOR SELECT
  TO anon
  USING (
    is_visible_to_child = true
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- System can insert audit logs (via functions)
-- Note: Direct inserts are handled by SECURITY DEFINER functions

-- No update or delete policies (enforced by trigger)

-- ============================================
-- ADDITIONAL SECURITY MEASURES
-- ============================================

-- Function to validate child token access
CREATE OR REPLACE FUNCTION validate_child_token(p_token_hash TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  case_id UUID,
  token_id UUID
) AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Find the token
  SELECT * INTO v_token_record
  FROM child_access_tokens
  WHERE token_hash = p_token_hash
    AND status = 'active'
    AND expires_at > NOW();
  
  IF v_token_record.id IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, NULL::UUID;
  ELSE
    -- Mark token as used if first use
    IF v_token_record.used_at IS NULL THEN
      UPDATE child_access_tokens
      SET used_at = NOW(),
          status = 'used'
      WHERE id = v_token_record.id;
    END IF;
    
    -- Log the access
    PERFORM log_audit_action(
      'token_used'::audit_action,
      NULL,
      'child_access_token',
      v_token_record.id,
      jsonb_build_object('case_id', v_token_record.case_id)
    );
    
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 
      v_token_record.case_id,
      v_token_record.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_social_worker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_foster_carer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_child_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_audit_action(audit_action, UUID, TEXT, UUID, JSONB, INET, TEXT) TO authenticated, anon;
