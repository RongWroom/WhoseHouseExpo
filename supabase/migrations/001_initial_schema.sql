-- ============================================
-- Whose House App - Initial Database Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('social_worker', 'foster_carer', 'admin');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE case_status AS ENUM ('active', 'pending', 'closed');
CREATE TYPE token_status AS ENUM ('active', 'used', 'expired', 'revoked');
CREATE TYPE audit_action AS ENUM (
  'user_login',
  'user_logout',
  'case_created',
  'case_updated',
  'case_accessed',
  'message_sent',
  'message_read',
  'token_generated',
  'token_used',
  'assignment_created',
  'assignment_removed',
  'profile_updated',
  'unauthorized_access_attempt'
);

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  avatar_url TEXT,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- ============================================
-- CASES TABLE (represents children in the system)
-- ============================================

CREATE TABLE cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL, -- Anonymized identifier
  social_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  foster_carer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status case_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb -- Non-PII metadata
);

-- Indexes for efficient lookups
CREATE INDEX idx_cases_social_worker ON cases(social_worker_id);
CREATE INDEX idx_cases_foster_carer ON cases(foster_carer_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_number ON cases(case_number);

-- ============================================
-- CHILD ACCESS TOKENS TABLE
-- ============================================

CREATE TABLE child_access_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, -- Hashed version of the token
  status token_status DEFAULT 'active' NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  device_info JSONB DEFAULT '{}'::jsonb, -- Store device info when used
  
  -- Ensure expiry is in the future when creating
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes for token lookups
CREATE INDEX idx_child_tokens_hash ON child_access_tokens(token_hash);
CREATE INDEX idx_child_tokens_case ON child_access_tokens(case_id);
CREATE INDEX idx_child_tokens_status ON child_access_tokens(status);
CREATE INDEX idx_child_tokens_expires ON child_access_tokens(expires_at);

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  child_token_id UUID REFERENCES child_access_tokens(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  status message_status DEFAULT 'sent' NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure at least one party is identified
  CONSTRAINT valid_parties CHECK (
    sender_id IS NOT NULL OR child_token_id IS NOT NULL
  ),
  -- Ensure case context exists
  CONSTRAINT message_has_case CHECK (case_id IS NOT NULL)
);

-- Indexes for message queries
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_case ON messages(case_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_urgent ON messages(is_urgent) WHERE is_urgent = true;

-- ============================================
-- CASE MEDIA TABLE (for house photos, etc.)
-- ============================================

CREATE TABLE case_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  description TEXT,
  is_visible_to_child BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for case media lookups
CREATE INDEX idx_case_media_case ON case_media(case_id);
CREATE INDEX idx_case_media_visible ON case_media(is_visible_to_child);

-- ============================================
-- AUDIT LOGS TABLE (Immutable)
-- ============================================

CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action audit_action NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type TEXT, -- 'case', 'message', 'profile', etc.
  target_id UUID, -- ID of the affected entity
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for audit queries
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Prevent updates and deletes on audit logs
CREATE OR REPLACE FUNCTION prevent_audit_changes() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_immutability
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_changes();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUDIT LOGGING FUNCTIONS
-- ============================================

-- Function to automatically log critical actions
CREATE OR REPLACE FUNCTION log_audit_action(
  p_action audit_action,
  p_user_id UUID,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (action, user_id, target_type, target_id, details, ip_address, user_agent)
  VALUES (p_action, p_user_id, p_target_type, p_target_id, p_details, p_ip_address, p_user_agent)
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MESSAGE VALIDATION FUNCTIONS
-- ============================================

-- Function to validate message paths according to business rules
CREATE OR REPLACE FUNCTION validate_message_path()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_role user_role;
  v_recipient_role user_role;
  v_child_message BOOLEAN := FALSE;
BEGIN
  -- Check if this is a child-initiated message
  IF NEW.child_token_id IS NOT NULL THEN
    v_child_message := TRUE;
    
    -- Child can only message their assigned social worker
    IF NEW.recipient_id IS NULL THEN
      RAISE EXCEPTION 'Child messages must have a recipient';
    END IF;
    
    -- Verify recipient is the assigned social worker
    IF NOT EXISTS (
      SELECT 1 FROM cases c
      JOIN child_access_tokens t ON t.case_id = c.id
      WHERE t.id = NEW.child_token_id
      AND c.social_worker_id = NEW.recipient_id
    ) THEN
      RAISE EXCEPTION 'Child can only message their assigned social worker';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Get sender and recipient roles
  SELECT role INTO v_sender_role FROM profiles WHERE id = NEW.sender_id;
  SELECT role INTO v_recipient_role FROM profiles WHERE id = NEW.recipient_id;
  
  -- Validate allowed communication paths
  CASE
    WHEN v_sender_role = 'social_worker' AND v_recipient_role = 'foster_carer' THEN
      -- Social Worker -> Foster Carer: Allowed
      RETURN NEW;
    WHEN v_sender_role = 'foster_carer' AND v_recipient_role = 'social_worker' THEN
      -- Foster Carer -> Social Worker: Allowed
      RETURN NEW;
    WHEN v_sender_role = 'social_worker' AND NEW.child_token_id IS NULL THEN
      -- Social Worker replying to child: Allowed (recipient would be NULL for child)
      IF NEW.recipient_id IS NULL AND NEW.case_id IS NOT NULL THEN
        RETURN NEW;
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid message path: % to %', v_sender_role, v_recipient_role;
  END CASE;
  
  RAISE EXCEPTION 'Message validation failed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_message_paths
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_path();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Create default organization
INSERT INTO organizations (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization');

-- ============================================
-- GRANT PERMISSIONS FOR SUPABASE
-- ============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon users (for limited public access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON organizations TO anon;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth with role-based access';
COMMENT ON TABLE cases IS 'Anonymized case records for children in the system';
COMMENT ON TABLE child_access_tokens IS 'Secure single-use tokens for child access';
COMMENT ON TABLE messages IS 'Secure messaging between authorized parties';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all critical actions';
COMMENT ON TABLE case_media IS 'Media files associated with cases (photos, documents)';
