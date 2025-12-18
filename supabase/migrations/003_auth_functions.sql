-- ============================================
-- Authentication & Token Management Functions
-- ============================================

-- ============================================
-- USER REGISTRATION & PROFILE CREATION
-- ============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_default_org_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Extract metadata from auth signup
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    organization_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'foster_carer'::user_role
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'organization_id')::UUID,
      v_default_org_id
    )
  );
  
  -- Log the registration
  PERFORM log_audit_action(
    'user_login'::audit_action,
    NEW.id,
    'profile',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'role', NEW.raw_user_meta_data->>'role',
      'signup', true
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CHILD ACCESS TOKEN GENERATION
-- ============================================

-- Function to generate a secure child access token
CREATE OR REPLACE FUNCTION public.generate_child_access_token(
  p_case_id UUID,
  p_expires_in_hours INTEGER DEFAULT 24
)
RETURNS JSON AS $$
DECLARE
  v_token TEXT;
  v_token_hash TEXT;
  v_token_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_case_record RECORD;
  v_social_worker_id UUID;
BEGIN
  -- Verify the user is the assigned social worker
  SELECT * INTO v_case_record
  FROM cases
  WHERE id = p_case_id
    AND social_worker_id = auth.uid()
    AND status = 'active';
  
  IF v_case_record.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You are not the assigned social worker for this case';
  END IF;
  
  -- Generate a cryptographically secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  
  -- Calculate expiration
  v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
  
  -- Revoke any existing active tokens for this case
  UPDATE child_access_tokens
  SET status = 'revoked'
  WHERE case_id = p_case_id
    AND status = 'active';
  
  -- Create the new token
  INSERT INTO child_access_tokens (
    case_id,
    token_hash,
    created_by,
    expires_at,
    status
  )
  VALUES (
    p_case_id,
    v_token_hash,
    auth.uid(),
    v_expires_at,
    'active'
  )
  RETURNING id INTO v_token_id;
  
  -- Log the token generation
  PERFORM log_audit_action(
    'token_generated'::audit_action,
    auth.uid(),
    'child_access_token',
    v_token_id,
    jsonb_build_object(
      'case_id', p_case_id,
      'expires_at', v_expires_at
    )
  );
  
  -- Return the token and metadata
  RETURN json_build_object(
    'token', v_token,
    'token_id', v_token_id,
    'expires_at', v_expires_at,
    'case_number', v_case_record.case_number,
    'access_url', '/child/access/' || v_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CHILD ACCESS VALIDATION
-- ============================================

-- Function to validate and use a child access token
CREATE OR REPLACE FUNCTION public.use_child_access_token(
  p_token TEXT,
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $$
DECLARE
  v_token_hash TEXT;
  v_token_record RECORD;
  v_case_record RECORD;
  v_social_worker RECORD;
BEGIN
  -- Hash the provided token
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  -- Find and validate the token
  SELECT * INTO v_token_record
  FROM child_access_tokens
  WHERE token_hash = v_token_hash;
  
  IF v_token_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired access token';
  END IF;
  
  -- Check token status
  IF v_token_record.status = 'revoked' THEN
    RAISE EXCEPTION 'This access token has been revoked';
  END IF;
  
  IF v_token_record.expires_at < NOW() THEN
    -- Mark as expired
    UPDATE child_access_tokens
    SET status = 'expired'
    WHERE id = v_token_record.id;
    
    RAISE EXCEPTION 'This access token has expired';
  END IF;
  
  -- Get case information
  SELECT * INTO v_case_record
  FROM cases
  WHERE id = v_token_record.case_id;
  
  IF v_case_record.status != 'active' THEN
    RAISE EXCEPTION 'This case is no longer active';
  END IF;
  
  -- Get social worker information
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.email
  INTO v_social_worker
  FROM profiles p
  WHERE p.id = v_case_record.social_worker_id;
  
  -- Update token usage if first use
  IF v_token_record.used_at IS NULL THEN
    UPDATE child_access_tokens
    SET 
      used_at = NOW(),
      device_info = p_device_info
    WHERE id = v_token_record.id;
  END IF;
  
  -- Log the access
  PERFORM log_audit_action(
    'token_used'::audit_action,
    NULL,
    'child_access_token',
    v_token_record.id,
    jsonb_build_object(
      'case_id', v_token_record.case_id,
      'device_info', p_device_info
    )
  );
  
  -- Return access information
  RETURN json_build_object(
    'valid', true,
    'token_id', v_token_record.id,
    'case_id', v_case_record.id,
    'case_number', v_case_record.case_number,
    'social_worker', json_build_object(
      'id', v_social_worker.id,
      'name', v_social_worker.full_name,
      'avatar_url', v_social_worker.avatar_url
    ),
    'can_message', true,
    'expires_at', v_token_record.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MESSAGING FUNCTIONS FOR CHILDREN
-- ============================================

-- Function for child to send message via token
CREATE OR REPLACE FUNCTION public.send_child_message(
  p_token TEXT,
  p_content TEXT
)
RETURNS JSON AS $$
DECLARE
  v_token_validation JSON;
  v_message_id UUID;
  v_case_id UUID;
  v_token_id UUID;
  v_social_worker_id UUID;
BEGIN
  -- Validate the token
  v_token_validation := use_child_access_token(p_token, '{}'::jsonb);
  
  IF NOT (v_token_validation->>'valid')::BOOLEAN THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;
  
  v_token_id := (v_token_validation->>'token_id')::UUID;
  v_case_id := (v_token_validation->>'case_id')::UUID;
  v_social_worker_id := (v_token_validation->'social_worker'->>'id')::UUID;
  
  -- Create the message
  INSERT INTO messages (
    sender_id,
    recipient_id,
    case_id,
    child_token_id,
    content,
    status
  )
  VALUES (
    NULL, -- Child has no profile
    v_social_worker_id,
    v_case_id,
    v_token_id,
    p_content,
    'sent'
  )
  RETURNING id INTO v_message_id;
  
  -- Log the message
  PERFORM log_audit_action(
    'message_sent'::audit_action,
    NULL,
    'message',
    v_message_id,
    jsonb_build_object(
      'case_id', v_case_id,
      'child_message', true,
      'recipient', v_social_worker_id
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id,
    'sent_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SESSION MANAGEMENT
-- ============================================

-- Function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET last_login = NOW()
  WHERE id = auth.uid();
  
  -- Log the login
  PERFORM log_audit_action(
    'user_login'::audit_action,
    auth.uid(),
    'profile',
    auth.uid(),
    jsonb_build_object('timestamp', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle logout
CREATE OR REPLACE FUNCTION public.handle_logout()
RETURNS VOID AS $$
BEGIN
  -- Log the logout
  PERFORM log_audit_action(
    'user_logout'::audit_action,
    auth.uid(),
    'profile',
    auth.uid(),
    jsonb_build_object('timestamp', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROLE & PERMISSION HELPERS
-- ============================================

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS JSON AS $$
DECLARE
  v_role user_role;
  v_permissions JSONB;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();
  
  CASE v_role
    WHEN 'admin' THEN
      v_permissions := jsonb_build_object(
        'manage_users', true,
        'manage_cases', true,
        'view_all_messages', true,
        'view_audit_logs', true,
        'manage_organization', true
      );
    WHEN 'social_worker' THEN
      v_permissions := jsonb_build_object(
        'manage_cases', true,
        'generate_child_tokens', true,
        'message_carers', true,
        'message_children', true,
        'view_case_history', true
      );
    WHEN 'foster_carer' THEN
      v_permissions := jsonb_build_object(
        'view_active_case', true,
        'message_social_worker', true,
        'upload_media', true,
        'view_case_media', true
      );
    ELSE
      v_permissions := '{}'::jsonb;
  END CASE;
  
  RETURN json_build_object(
    'role', v_role,
    'permissions', v_permissions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CASE ASSIGNMENT FUNCTIONS
-- ============================================

-- Function to assign a foster carer to a case
CREATE OR REPLACE FUNCTION public.assign_foster_carer(
  p_case_id UUID,
  p_foster_carer_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_case RECORD;
  v_carer RECORD;
BEGIN
  -- Verify the user is the assigned social worker
  SELECT * INTO v_case
  FROM cases
  WHERE id = p_case_id
    AND social_worker_id = auth.uid();
  
  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You are not the assigned social worker for this case';
  END IF;
  
  -- Verify the foster carer exists and has the correct role
  SELECT * INTO v_carer
  FROM profiles
  WHERE id = p_foster_carer_id
    AND role = 'foster_carer';
  
  IF v_carer.id IS NULL THEN
    RAISE EXCEPTION 'Invalid foster carer ID';
  END IF;
  
  -- Check if carer already has an active case
  IF EXISTS (
    SELECT 1 FROM cases
    WHERE foster_carer_id = p_foster_carer_id
      AND status = 'active'
      AND id != p_case_id
  ) THEN
    RAISE EXCEPTION 'Foster carer already has an active case';
  END IF;
  
  -- Update the case
  UPDATE cases
  SET 
    foster_carer_id = p_foster_carer_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_case_id;
  
  -- Log the assignment
  PERFORM log_audit_action(
    'assignment_created'::audit_action,
    auth.uid(),
    'case',
    p_case_id,
    jsonb_build_object(
      'foster_carer_id', p_foster_carer_id,
      'assigned_by', auth.uid()
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'case_id', p_case_id,
    'foster_carer_id', p_foster_carer_id,
    'assigned_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.generate_child_access_token(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_child_access_token(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.send_child_message(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_last_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_logout() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_foster_carer(UUID, UUID) TO authenticated;
