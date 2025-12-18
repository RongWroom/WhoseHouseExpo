-- ============================================
-- Admin Management System
-- ============================================

-- ============================================
-- ADMIN MANAGEMENT FUNCTIONS
-- ============================================

-- Function to create a new user account (admin only)
CREATE OR REPLACE FUNCTION create_user_account(
  p_email TEXT,
  p_full_name TEXT,
  p_role user_role,
  p_organization_id UUID,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_admin_role user_role;
  v_admin_org UUID;
  v_temp_password TEXT;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can create user accounts';
  END IF;
  
  -- Ensure admin can only create users in their organization
  IF p_organization_id != v_admin_org THEN
    RAISE EXCEPTION 'Cannot create users for other organizations';
  END IF;
  
  -- Generate a temporary password
  v_temp_password := 'Welcome' || substr(md5(random()::text), 1, 8) || '!';
  
  -- Create the auth user
  -- Note: In production, this would send an invite email
  -- For now, we'll return the temp password in the response
  v_user_id := extensions.uuid_generate_v4();
  
  -- Insert profile (auth trigger will handle the rest)
  INSERT INTO profiles (
    id, 
    email, 
    full_name, 
    role, 
    organization_id, 
    phone_number, 
    metadata
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    p_role,
    p_organization_id,
    p_phone_number,
    jsonb_build_object(
      'created_by', auth.uid(),
      'temp_password', v_temp_password,
      'requires_password_change', true
    )
  );
  
  -- Log the action
  PERFORM log_audit_action(
    'user_created'::audit_action,
    auth.uid(),
    'profile',
    v_user_id,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'organization_id', p_organization_id
    )
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate a user account (admin only)
CREATE OR REPLACE FUNCTION deactivate_user_account(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role user_role;
  v_admin_org UUID;
  v_target_org UUID;
  v_target_role user_role;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can deactivate accounts';
  END IF;
  
  -- Get target user's organization
  SELECT organization_id, role INTO v_target_org, v_target_role 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_target_org != v_admin_org THEN
    RAISE EXCEPTION 'Cannot deactivate users from other organizations';
  END IF;
  
  -- Prevent admin from deactivating themselves
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;
  
  -- Prevent deactivating the last admin
  IF v_target_role = 'admin' THEN
    IF (SELECT COUNT(*) FROM profiles 
        WHERE organization_id = v_admin_org 
        AND role = 'admin' 
        AND is_active = true
        AND id != p_user_id) = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate the last admin account';
    END IF;
  END IF;
  
  -- Deactivate the account
  UPDATE profiles 
  SET 
    is_active = false,
    updated_at = NOW(),
    metadata = metadata || jsonb_build_object(
      'deactivated_by', auth.uid(),
      'deactivated_at', NOW(),
      'deactivation_reason', p_reason
    )
  WHERE id = p_user_id;
  
  -- Remove from active case assignments
  UPDATE cases 
  SET 
    social_worker_id = NULL 
  WHERE social_worker_id = p_user_id 
    AND status = 'active';
  
  UPDATE cases 
  SET 
    foster_carer_id = NULL 
  WHERE foster_carer_id = p_user_id 
    AND status = 'active';
  
  -- Log the action
  PERFORM log_audit_action(
    'user_deactivated'::audit_action,
    auth.uid(),
    'profile',
    p_user_id,
    jsonb_build_object('reason', p_reason)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to reactivate a user account (admin only)
CREATE OR REPLACE FUNCTION reactivate_user_account(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role user_role;
  v_admin_org UUID;
  v_target_org UUID;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can reactivate accounts';
  END IF;
  
  -- Get target user's organization
  SELECT organization_id INTO v_target_org 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_target_org != v_admin_org THEN
    RAISE EXCEPTION 'Cannot reactivate users from other organizations';
  END IF;
  
  -- Reactivate the account
  UPDATE profiles 
  SET 
    is_active = true,
    updated_at = NOW(),
    metadata = metadata || jsonb_build_object(
      'reactivated_by', auth.uid(),
      'reactivated_at', NOW()
    )
  WHERE id = p_user_id;
  
  -- Log the action
  PERFORM log_audit_action(
    'user_reactivated'::audit_action,
    auth.uid(),
    'profile',
    p_user_id,
    jsonb_build_object()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to assign a social worker to a foster carer (admin only)
CREATE OR REPLACE FUNCTION assign_social_worker_to_carer(
  p_social_worker_id UUID,
  p_foster_carer_id UUID,
  p_case_number TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role user_role;
  v_admin_org UUID;
  v_case_id UUID;
  v_sw_role user_role;
  v_fc_role user_role;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can create assignments';
  END IF;
  
  -- Verify both users are in the same organization and have correct roles
  SELECT role INTO v_sw_role 
  FROM profiles 
  WHERE id = p_social_worker_id 
    AND organization_id = v_admin_org 
    AND is_active = true;
  
  SELECT role INTO v_fc_role 
  FROM profiles 
  WHERE id = p_foster_carer_id 
    AND organization_id = v_admin_org 
    AND is_active = true;
  
  IF v_sw_role != 'social_worker' THEN
    RAISE EXCEPTION 'Invalid social worker ID or not active';
  END IF;
  
  IF v_fc_role != 'foster_carer' THEN
    RAISE EXCEPTION 'Invalid foster carer ID or not active';
  END IF;
  
  -- Close any existing active cases for this foster carer
  UPDATE cases 
  SET 
    status = 'closed',
    closed_at = NOW()
  WHERE foster_carer_id = p_foster_carer_id 
    AND status = 'active';
  
  -- Create new case
  INSERT INTO cases (
    case_number,
    social_worker_id,
    foster_carer_id,
    status,
    metadata
  ) VALUES (
    COALESCE(p_case_number, 'CASE-' || substr(md5(random()::text), 1, 8)),
    p_social_worker_id,
    p_foster_carer_id,
    'active',
    jsonb_build_object(
      'assigned_by', auth.uid(),
      'assigned_at', NOW()
    )
  ) RETURNING id INTO v_case_id;
  
  -- Log the action
  PERFORM log_audit_action(
    'assignment_created'::audit_action,
    auth.uid(),
    'case',
    v_case_id,
    jsonb_build_object(
      'social_worker_id', p_social_worker_id,
      'foster_carer_id', p_foster_carer_id
    )
  );
  
  RETURN v_case_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization statistics (admin only)
CREATE OR REPLACE FUNCTION get_organization_stats()
RETURNS TABLE (
  total_users INTEGER,
  active_users INTEGER,
  social_workers INTEGER,
  foster_carers INTEGER,
  admins INTEGER,
  active_cases INTEGER,
  closed_cases INTEGER,
  messages_this_month INTEGER
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role user_role;
  v_admin_org UUID;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can view organization statistics';
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_users,
    COUNT(*) FILTER (WHERE p.is_active = true)::INTEGER AS active_users,
    COUNT(*) FILTER (WHERE p.role = 'social_worker')::INTEGER AS social_workers,
    COUNT(*) FILTER (WHERE p.role = 'foster_carer')::INTEGER AS foster_carers,
    COUNT(*) FILTER (WHERE p.role = 'admin')::INTEGER AS admins,
    (SELECT COUNT(*)::INTEGER FROM cases c 
     WHERE c.status = 'active' 
     AND (c.social_worker_id IN (SELECT id FROM profiles WHERE organization_id = v_admin_org)
          OR c.foster_carer_id IN (SELECT id FROM profiles WHERE organization_id = v_admin_org))
    ) AS active_cases,
    (SELECT COUNT(*)::INTEGER FROM cases c 
     WHERE c.status = 'closed' 
     AND (c.social_worker_id IN (SELECT id FROM profiles WHERE organization_id = v_admin_org)
          OR c.foster_carer_id IN (SELECT id FROM profiles WHERE organization_id = v_admin_org))
    ) AS closed_cases,
    (SELECT COUNT(*)::INTEGER FROM messages m 
     WHERE m.sent_at >= date_trunc('month', CURRENT_DATE)
     AND (m.sender_id IN (SELECT id FROM profiles WHERE organization_id = v_admin_org)
          OR m.recipient_id IN (SELECT id FROM profiles WHERE organization_id = v_admin_org))
    ) AS messages_this_month
  FROM profiles p
  WHERE p.organization_id = v_admin_org;
END;
$$ LANGUAGE plpgsql;

-- Function to list all users in organization (admin only)
CREATE OR REPLACE FUNCTION list_organization_users(
  p_role_filter user_role DEFAULT NULL,
  p_active_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role user_role,
  phone_number TEXT,
  is_active BOOLEAN,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  active_case_count INTEGER
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role user_role;
  v_admin_org UUID;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can list organization users';
  END IF;
  
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.phone_number,
    p.is_active,
    p.last_login,
    p.created_at,
    CASE 
      WHEN p.role = 'social_worker' THEN 
        (SELECT COUNT(*)::INTEGER FROM cases c 
         WHERE c.social_worker_id = p.id AND c.status = 'active')
      WHEN p.role = 'foster_carer' THEN 
        (SELECT COUNT(*)::INTEGER FROM cases c 
         WHERE c.foster_carer_id = p.id AND c.status = 'active')
      ELSE 0
    END AS active_case_count
  FROM profiles p
  WHERE p.organization_id = v_admin_org
    AND (p_role_filter IS NULL OR p.role = p_role_filter)
    AND (NOT p_active_only OR p.is_active = true)
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update user details (admin only)
CREATE OR REPLACE FUNCTION update_user_details(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role user_role;
  v_admin_org UUID;
  v_target_org UUID;
BEGIN
  -- Check if caller is an admin
  SELECT role, organization_id INTO v_admin_role, v_admin_org 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can update user details';
  END IF;
  
  -- Get target user's organization
  SELECT organization_id INTO v_target_org 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_target_org != v_admin_org THEN
    RAISE EXCEPTION 'Cannot update users from other organizations';
  END IF;
  
  -- Update user details
  UPDATE profiles 
  SET 
    full_name = COALESCE(p_full_name, full_name),
    phone_number = COALESCE(p_phone_number, phone_number),
    email = COALESCE(p_email, email),
    updated_at = NOW(),
    metadata = metadata || jsonb_build_object(
      'updated_by', auth.uid(),
      'updated_at', NOW()
    )
  WHERE id = p_user_id;
  
  -- Log the action
  PERFORM log_audit_action(
    'profile_updated'::audit_action,
    auth.uid(),
    'profile',
    p_user_id,
    jsonb_build_object(
      'fields_updated', jsonb_build_object(
        'full_name', p_full_name IS NOT NULL,
        'phone_number', p_phone_number IS NOT NULL,
        'email', p_email IS NOT NULL
      )
    )
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE AUDIT_ACTION ENUM
-- ============================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'user_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'user_deactivated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'user_reactivated';

-- ============================================
-- ROW LEVEL SECURITY FOR ADMIN FUNCTIONS
-- ============================================

-- Admins can view all users in their organization
CREATE POLICY "Admins can view organization users" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
      AND admin_profile.organization_id = profiles.organization_id
    )
  );

-- Admins can update users in their organization
CREATE POLICY "Admins can update organization users" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role = 'admin'
      AND admin_profile.organization_id = profiles.organization_id
    )
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION assign_social_worker_to_carer TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_stats TO authenticated;
GRANT EXECUTE ON FUNCTION list_organization_users TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_details TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION create_user_account IS 'Admin function to create new user accounts within the organization';
COMMENT ON FUNCTION deactivate_user_account IS 'Admin function to deactivate user accounts';
COMMENT ON FUNCTION reactivate_user_account IS 'Admin function to reactivate previously deactivated accounts';
COMMENT ON FUNCTION assign_social_worker_to_carer IS 'Admin function to create case assignments';
COMMENT ON FUNCTION get_organization_stats IS 'Admin function to get organization-wide statistics';
COMMENT ON FUNCTION list_organization_users IS 'Admin function to list all users in the organization';
COMMENT ON FUNCTION update_user_details IS 'Admin function to update user profile details';
