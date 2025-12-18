-- ============================================
-- Whose House App - Household Model for Foster Carers
-- ============================================
-- Allows multiple foster carers to be part of the same household,
-- sharing access to cases while maintaining individual accountability.

-- ============================================
-- HOUSEHOLDS TABLE
-- ============================================

CREATE TABLE households (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "The Smiths", "Smith-Jones Family"
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for organization lookups
CREATE INDEX idx_households_organization ON households(organization_id);

-- Apply updated_at trigger
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ADD HOUSEHOLD FIELDS TO PROFILES
-- ============================================

-- Add household_id to profiles (optional - only for foster carers)
ALTER TABLE profiles ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;

-- Add is_primary_carer flag (for household management permissions)
ALTER TABLE profiles ADD COLUMN is_primary_carer BOOLEAN DEFAULT false;

-- Index for household lookups
CREATE INDEX idx_profiles_household ON profiles(household_id);

-- ============================================
-- HOUSEHOLD INVITATIONS TABLE
-- ============================================

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE household_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status invitation_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
  accepted_at TIMESTAMPTZ,

  -- Each email can only have one pending invitation per household
  CONSTRAINT unique_pending_invitation UNIQUE (household_id, email)
);

-- Indexes
CREATE INDEX idx_household_invitations_email ON household_invitations(email);
CREATE INDEX idx_household_invitations_status ON household_invitations(status);
CREATE INDEX idx_household_invitations_household ON household_invitations(household_id);

-- ============================================
-- UPDATE CASES TABLE TO REFERENCE HOUSEHOLD
-- ============================================

-- Add household_id to cases (allows assignment to household instead of individual)
ALTER TABLE cases ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;

-- Index for household case lookups
CREATE INDEX idx_cases_household ON cases(household_id);

-- ============================================
-- ROW LEVEL SECURITY FOR HOUSEHOLDS
-- ============================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

-- Households: Members can view their own household
CREATE POLICY "household_members_view" ON households
  FOR SELECT
  USING (
    id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'social_worker')
  );

-- Households: Primary carer can update their household
CREATE POLICY "primary_carer_update" ON households
  FOR UPDATE
  USING (
    id IN (SELECT household_id FROM profiles WHERE id = auth.uid() AND is_primary_carer = true)
  );

-- Households: Admins can manage all households
CREATE POLICY "admin_manage_households" ON households
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invitations: Invited user can view their invitation
CREATE POLICY "invitee_view_invitation" ON household_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR
    invited_by = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invitations: Primary carer can create invitations
CREATE POLICY "primary_carer_create_invitation" ON household_invitations
  FOR INSERT
  WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid() AND is_primary_carer = true)
  );

-- Invitations: Invitee can update (accept/decline) their invitation
CREATE POLICY "invitee_update_invitation" ON household_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create a household for a new foster carer
CREATE OR REPLACE FUNCTION create_household_for_carer(
  p_user_id UUID,
  p_household_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = p_user_id;

  -- Create household
  INSERT INTO households (name, organization_id)
  VALUES (p_household_name, v_org_id)
  RETURNING id INTO v_household_id;

  -- Link user to household as primary carer
  UPDATE profiles
  SET household_id = v_household_id, is_primary_carer = true
  WHERE id = p_user_id;

  RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite a carer to household
CREATE OR REPLACE FUNCTION invite_carer_to_household(
  p_inviter_id UUID,
  p_email TEXT
)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
  v_invitation_id UUID;
  v_is_primary BOOLEAN;
BEGIN
  -- Check if inviter is primary carer
  SELECT household_id, is_primary_carer
  INTO v_household_id, v_is_primary
  FROM profiles
  WHERE id = p_inviter_id;

  IF NOT v_is_primary THEN
    RAISE EXCEPTION 'Only primary carer can invite others';
  END IF;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Inviter does not belong to a household';
  END IF;

  -- Check if email is already in household
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE email = p_email AND household_id = v_household_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this household';
  END IF;

  -- Expire any existing pending invitations
  UPDATE household_invitations
  SET status = 'expired'
  WHERE household_id = v_household_id
    AND email = p_email
    AND status = 'pending';

  -- Create new invitation
  INSERT INTO household_invitations (household_id, invited_by, email)
  VALUES (v_household_id, p_inviter_id, p_email)
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept household invitation
CREATE OR REPLACE FUNCTION accept_household_invitation(
  p_user_id UUID,
  p_invitation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation household_invitations%ROWTYPE;
  v_user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM profiles WHERE id = p_user_id;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM household_invitations
  WHERE id = p_invitation_id;

  -- Validate invitation
  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitation.email != v_user_email THEN
    RAISE EXCEPTION 'Invitation is for a different email address';
  END IF;

  IF v_invitation.status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;

  IF v_invitation.expires_at < NOW() THEN
    UPDATE household_invitations SET status = 'expired' WHERE id = p_invitation_id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  -- Accept invitation
  UPDATE household_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_invitation_id;

  -- Add user to household
  UPDATE profiles
  SET household_id = v_invitation.household_id, is_primary_carer = false
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get household members
CREATE OR REPLACE FUNCTION get_household_members(p_household_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  is_primary_carer BOOLEAN,
  last_login TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.is_primary_carer,
    p.last_login
  FROM profiles p
  WHERE p.household_id = p_household_id
    AND p.is_active = true
  ORDER BY p.is_primary_carer DESC, p.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave household (for non-primary carers)
CREATE OR REPLACE FUNCTION leave_household(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_primary BOOLEAN;
BEGIN
  SELECT is_primary_carer INTO v_is_primary FROM profiles WHERE id = p_user_id;

  IF v_is_primary THEN
    RAISE EXCEPTION 'Primary carer cannot leave household. Transfer ownership first.';
  END IF;

  UPDATE profiles
  SET household_id = NULL, is_primary_carer = false
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer primary carer status
CREATE OR REPLACE FUNCTION transfer_primary_carer(
  p_current_primary_id UUID,
  p_new_primary_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_household_id UUID;
  v_new_household_id UUID;
BEGIN
  -- Get current primary's household
  SELECT household_id INTO v_household_id
  FROM profiles
  WHERE id = p_current_primary_id AND is_primary_carer = true;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'User is not a primary carer';
  END IF;

  -- Verify new primary is in same household
  SELECT household_id INTO v_new_household_id
  FROM profiles
  WHERE id = p_new_primary_id;

  IF v_new_household_id != v_household_id THEN
    RAISE EXCEPTION 'New primary must be in the same household';
  END IF;

  -- Transfer primary status
  UPDATE profiles SET is_primary_carer = false WHERE id = p_current_primary_id;
  UPDATE profiles SET is_primary_carer = true WHERE id = p_new_primary_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE RLS FOR CASES TO INCLUDE HOUSEHOLD
-- ============================================

-- Drop existing foster carer case policy if exists
DROP POLICY IF EXISTS "foster_carers_view_assigned_cases" ON cases;

-- Foster carers can view cases assigned to them OR their household
CREATE POLICY "foster_carers_view_assigned_cases" ON cases
  FOR SELECT
  USING (
    foster_carer_id = auth.uid()
    OR
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- UPDATE MESSAGE RLS FOR HOUSEHOLD ACCESS
-- ============================================

-- Drop existing message policies if they conflict
DROP POLICY IF EXISTS "foster_carers_view_household_messages" ON messages;

-- Foster carers can view messages where they or any household member is recipient
CREATE POLICY "foster_carers_view_household_messages" ON messages
  FOR SELECT
  USING (
    -- User is sender or recipient
    sender_id = auth.uid() OR recipient_id = auth.uid()
    OR
    -- User is in same household as recipient
    recipient_id IN (
      SELECT p2.id FROM profiles p1
      JOIN profiles p2 ON p1.household_id = p2.household_id
      WHERE p1.id = auth.uid() AND p1.household_id IS NOT NULL
    )
    OR
    -- Message is for a case the user can access (via household)
    case_id IN (
      SELECT c.id FROM cases c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.household_id = p.household_id AND p.household_id IS NOT NULL
    )
  );

-- Foster carers can send messages on cases they have access to via household
DROP POLICY IF EXISTS "foster_carers_send_household_messages" ON messages;
CREATE POLICY "foster_carers_send_household_messages" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND case_id IN (
      SELECT c.id FROM cases c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.foster_carer_id = auth.uid()
        OR c.household_id = p.household_id
    )
  );

-- ============================================
-- AUDIT ACTION FOR HOUSEHOLD EVENTS
-- ============================================

-- Add new audit actions for household events
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'household_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'household_invitation_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'household_invitation_accepted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'household_member_left';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'household_primary_transferred';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON households TO authenticated;
GRANT ALL ON household_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION create_household_for_carer TO authenticated;
GRANT EXECUTE ON FUNCTION invite_carer_to_household TO authenticated;
GRANT EXECUTE ON FUNCTION accept_household_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_members TO authenticated;
GRANT EXECUTE ON FUNCTION leave_household TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_primary_carer TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE households IS 'Represents a foster carer household that can have multiple carers';
COMMENT ON TABLE household_invitations IS 'Invitations for carers to join a household';
COMMENT ON COLUMN profiles.household_id IS 'The household this foster carer belongs to';
COMMENT ON COLUMN profiles.is_primary_carer IS 'Whether this carer is the primary/admin of their household';
COMMENT ON COLUMN cases.household_id IS 'The household assigned to this case';
