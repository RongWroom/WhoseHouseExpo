-- ============================================
-- Whose House App - Case Creation, Bed Management & Placement Requests
-- ============================================
-- Enables social workers to create cases and search for available carers
-- Adds bed/capacity tracking with bed blocking logic
-- Implements placement request workflow (send, accept/decline)

-- ============================================
-- ENUM TYPES
-- ============================================

DO $$ BEGIN
  CREATE TYPE placement_type AS ENUM ('respite', 'long_term', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('available', 'away', 'full');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE placement_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- ADD CAPACITY FIELDS TO HOUSEHOLDS
-- ============================================

-- Number of bedrooms available for fostering
ALTER TABLE households ADD COLUMN IF NOT EXISTS total_bedrooms INTEGER DEFAULT 1 NOT NULL;

-- Current availability status (can be manually set by carer)
DO $$ BEGIN
  ALTER TABLE households ADD COLUMN availability_status availability_status DEFAULT 'available' NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Away dates (optional - for planned absences)
ALTER TABLE households ADD COLUMN IF NOT EXISTS away_from TIMESTAMPTZ;
ALTER TABLE households ADD COLUMN IF NOT EXISTS away_until TIMESTAMPTZ;

-- Notes for availability (e.g., "On holiday until March 15")
ALTER TABLE households ADD COLUMN IF NOT EXISTS availability_notes TEXT;

-- Default preference: can children in this household share the house with other foster children?
ALTER TABLE households ADD COLUMN IF NOT EXISTS allows_house_sharing BOOLEAN DEFAULT true NOT NULL;

-- ============================================
-- ADD PLACEMENT DETAILS TO CASES
-- ============================================

-- Placement type (respite, long_term, emergency)
DO $$ BEGIN
  ALTER TABLE cases ADD COLUMN placement_type placement_type DEFAULT 'long_term' NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Child sharing preference (set by social worker based on child assessment)
-- true = child CAN share house with other foster children
-- false = child needs exclusive placement (blocks all remaining beds)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS child_can_share BOOLEAN DEFAULT true NOT NULL;

-- Expected end date (especially relevant for respite)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS expected_end_date DATE;

-- Internal notes (only visible to social workers)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Child age range (for matching - anonymized)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS child_age_range TEXT; -- e.g., "5-7", "10-12"

-- Child gender (for matching - if relevant)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS child_gender TEXT; -- e.g., "male", "female", "any"

-- ============================================
-- PLACEMENT REQUESTS TABLE
-- ============================================
-- When a social worker wants to place a child, they send a request to a household

CREATE TABLE IF NOT EXISTS placement_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL, -- Social worker
  status placement_request_status DEFAULT 'pending' NOT NULL,

  -- Request details
  placement_type placement_type NOT NULL,
  expected_start_date DATE,
  expected_end_date DATE,
  message TEXT, -- Message from social worker to carer

  -- Response
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Carer who responded
  response_message TEXT,
  responded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours') NOT NULL,

  -- Only one pending request per case-household combination
  CONSTRAINT unique_pending_request UNIQUE (case_id, household_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_placement_requests_case ON placement_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_placement_requests_household ON placement_requests(household_id);
CREATE INDEX IF NOT EXISTS idx_placement_requests_status ON placement_requests(status);
CREATE INDEX IF NOT EXISTS idx_placement_requests_requested_by ON placement_requests(requested_by);

-- ============================================
-- ROW LEVEL SECURITY FOR PLACEMENT REQUESTS
-- ============================================

ALTER TABLE placement_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "social_workers_view_requests" ON placement_requests;
DROP POLICY IF EXISTS "social_workers_create_requests" ON placement_requests;
DROP POLICY IF EXISTS "social_workers_cancel_requests" ON placement_requests;
DROP POLICY IF EXISTS "foster_carers_view_requests" ON placement_requests;
DROP POLICY IF EXISTS "foster_carers_respond_requests" ON placement_requests;
DROP POLICY IF EXISTS "admins_view_all_requests" ON placement_requests;

-- Social workers can view requests they created or for cases they manage
CREATE POLICY "social_workers_view_requests" ON placement_requests
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'social_worker')
    AND (
      requested_by = auth.uid()
      OR
      case_id IN (SELECT id FROM cases WHERE social_worker_id = auth.uid())
    )
  );

-- Social workers can create requests for their cases
CREATE POLICY "social_workers_create_requests" ON placement_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'social_worker')
    AND requested_by = auth.uid()
    AND case_id IN (SELECT id FROM cases WHERE social_worker_id = auth.uid())
  );

-- Social workers can cancel their own pending requests
CREATE POLICY "social_workers_cancel_requests" ON placement_requests
  FOR UPDATE
  USING (
    requested_by = auth.uid()
    AND status = 'pending'
  );

-- Foster carers can view requests for their household
CREATE POLICY "foster_carers_view_requests" ON placement_requests
  FOR SELECT
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );

-- Foster carers can respond to requests for their household
CREATE POLICY "foster_carers_respond_requests" ON placement_requests
  FOR UPDATE
  USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Admins can view all
CREATE POLICY "admins_view_all_requests" ON placement_requests
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate available beds for a household
CREATE OR REPLACE FUNCTION get_household_available_beds(p_household_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_beds INTEGER;
  v_blocked_beds INTEGER := 0;
  v_allows_sharing BOOLEAN;
  v_case RECORD;
BEGIN
  -- Get household capacity
  SELECT total_bedrooms, allows_house_sharing
  INTO v_total_beds, v_allows_sharing
  FROM households
  WHERE id = p_household_id;

  IF v_total_beds IS NULL THEN
    RETURN 0;
  END IF;

  -- Count blocked beds from active cases
  FOR v_case IN
    SELECT child_can_share
    FROM cases
    WHERE household_id = p_household_id
      AND status = 'active'
  LOOP
    IF v_case.child_can_share AND v_allows_sharing THEN
      -- Child can share, only blocks 1 bed
      v_blocked_beds := v_blocked_beds + 1;
    ELSE
      -- Child needs own room - blocks ALL remaining beds
      RETURN 0;
    END IF;
  END LOOP;

  RETURN GREATEST(0, v_total_beds - v_blocked_beds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a household is available for placement
CREATE OR REPLACE FUNCTION is_household_available(
  p_household_id UUID,
  p_child_can_share BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
  v_household households%ROWTYPE;
  v_available_beds INTEGER;
BEGIN
  -- Get household
  SELECT * INTO v_household FROM households WHERE id = p_household_id;

  IF v_household.id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check availability status
  IF v_household.availability_status = 'away' THEN
    RETURN FALSE;
  END IF;

  IF v_household.availability_status = 'full' THEN
    RETURN FALSE;
  END IF;

  -- Check if within away dates
  IF v_household.away_from IS NOT NULL AND v_household.away_until IS NOT NULL THEN
    IF NOW() >= v_household.away_from AND NOW() <= v_household.away_until THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check available beds
  v_available_beds := get_household_available_beds(p_household_id);

  -- If child can't share and household has other children, not available
  IF NOT p_child_can_share THEN
    -- Need at least total_bedrooms beds free (blocks all)
    RETURN v_available_beds = v_household.total_bedrooms;
  END IF;

  -- Otherwise just need 1+ beds
  RETURN v_available_beds > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search for available households
DROP FUNCTION IF EXISTS search_available_households(UUID, BOOLEAN, placement_type);
CREATE OR REPLACE FUNCTION search_available_households(
  p_organization_id UUID,
  p_child_can_share BOOLEAN DEFAULT true,
  p_placement_type placement_type DEFAULT 'long_term'
)
RETURNS TABLE (
  household_id UUID,
  household_name TEXT,
  total_bedrooms INTEGER,
  available_beds INTEGER,
  availability_status availability_status,
  allows_house_sharing BOOLEAN,
  primary_carer_name TEXT,
  primary_carer_id UUID,
  active_cases_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id AS household_id,
    h.name AS household_name,
    h.total_bedrooms,
    get_household_available_beds(h.id) AS available_beds,
    h.availability_status,
    h.allows_house_sharing,
    p.full_name AS primary_carer_name,
    p.id AS primary_carer_id,
    (SELECT COUNT(*) FROM cases c WHERE c.household_id = h.id AND c.status = 'active') AS active_cases_count
  FROM households h
  LEFT JOIN profiles p ON p.household_id = h.id AND p.is_primary_carer = true
  WHERE h.organization_id = p_organization_id
    AND is_household_available(h.id, p_child_can_share)
  ORDER BY get_household_available_beds(h.id) DESC, h.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new case (social worker only)
CREATE OR REPLACE FUNCTION create_case(
  p_social_worker_id UUID,
  p_placement_type placement_type DEFAULT 'long_term',
  p_child_can_share BOOLEAN DEFAULT true,
  p_child_age_range TEXT DEFAULT NULL,
  p_child_gender TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_expected_end_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_case_id UUID;
  v_case_number TEXT;
  v_org_id UUID;
BEGIN
  -- Verify caller is a social worker
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_social_worker_id AND role = 'social_worker'
  ) THEN
    RAISE EXCEPTION 'Only social workers can create cases';
  END IF;

  -- Get organization
  SELECT organization_id INTO v_org_id FROM profiles WHERE id = p_social_worker_id;

  -- Generate unique case number (format: WH-YYYYMM-XXXX)
  v_case_number := 'WH-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                   LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM cases WHERE case_number = v_case_number) LOOP
    v_case_number := 'WH-' || TO_CHAR(NOW(), 'YYYYMM') || '-' ||
                     LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;

  -- Create the case
  INSERT INTO cases (
    case_number,
    social_worker_id,
    status,
    placement_type,
    child_can_share,
    child_age_range,
    child_gender,
    internal_notes,
    expected_end_date
  ) VALUES (
    v_case_number,
    p_social_worker_id,
    'pending',
    p_placement_type,
    p_child_can_share,
    p_child_age_range,
    p_child_gender,
    p_internal_notes,
    p_expected_end_date
  )
  RETURNING id INTO v_case_id;

  -- Log audit event
  PERFORM log_audit_action(
    'case_created',
    p_social_worker_id,
    'case',
    v_case_id,
    jsonb_build_object(
      'case_number', v_case_number,
      'placement_type', p_placement_type,
      'child_can_share', p_child_can_share
    )
  );

  RETURN v_case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a placement request
CREATE OR REPLACE FUNCTION send_placement_request(
  p_social_worker_id UUID,
  p_case_id UUID,
  p_household_id UUID,
  p_message TEXT DEFAULT NULL,
  p_expected_start_date DATE DEFAULT NULL,
  p_expected_end_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_case cases%ROWTYPE;
BEGIN
  -- Get case details
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;

  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Case not found';
  END IF;

  -- Verify social worker owns the case
  IF v_case.social_worker_id != p_social_worker_id THEN
    RAISE EXCEPTION 'You can only send requests for your own cases';
  END IF;

  -- Verify case is pending (not already assigned)
  IF v_case.status != 'pending' THEN
    RAISE EXCEPTION 'Case is already assigned or closed';
  END IF;

  -- Verify household is available
  IF NOT is_household_available(p_household_id, v_case.child_can_share) THEN
    RAISE EXCEPTION 'Household is not available for this placement';
  END IF;

  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM placement_requests
    WHERE case_id = p_case_id
      AND household_id = p_household_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending request already exists for this household';
  END IF;

  -- Create the request
  INSERT INTO placement_requests (
    case_id,
    household_id,
    requested_by,
    placement_type,
    message,
    expected_start_date,
    expected_end_date
  ) VALUES (
    p_case_id,
    p_household_id,
    p_social_worker_id,
    v_case.placement_type,
    p_message,
    p_expected_start_date,
    COALESCE(p_expected_end_date, v_case.expected_end_date)
  )
  RETURNING id INTO v_request_id;

  -- Log audit event
  PERFORM log_audit_action(
    'assignment_created',
    p_social_worker_id,
    'placement_request',
    v_request_id,
    jsonb_build_object(
      'case_id', p_case_id,
      'household_id', p_household_id,
      'action', 'request_sent'
    )
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for foster carer to respond to placement request
CREATE OR REPLACE FUNCTION respond_to_placement_request(
  p_carer_id UUID,
  p_request_id UUID,
  p_accept BOOLEAN,
  p_response_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request placement_requests%ROWTYPE;
  v_carer_household_id UUID;
BEGIN
  -- Get carer's household
  SELECT household_id INTO v_carer_household_id
  FROM profiles WHERE id = p_carer_id;

  -- Get request
  SELECT * INTO v_request FROM placement_requests WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  -- Verify request is for carer's household
  IF v_request.household_id != v_carer_household_id THEN
    RAISE EXCEPTION 'You can only respond to requests for your household';
  END IF;

  -- Verify request is pending
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is no longer pending';
  END IF;

  -- Check if expired
  IF v_request.expires_at < NOW() THEN
    UPDATE placement_requests SET status = 'expired' WHERE id = p_request_id;
    RAISE EXCEPTION 'Request has expired';
  END IF;

  IF p_accept THEN
    -- Accept the request
    UPDATE placement_requests
    SET status = 'accepted',
        responded_by = p_carer_id,
        response_message = p_response_message,
        responded_at = NOW()
    WHERE id = p_request_id;

    -- Assign the case to the household
    UPDATE cases
    SET household_id = v_request.household_id,
        foster_carer_id = p_carer_id,
        status = 'active'
    WHERE id = v_request.case_id;

    -- Cancel any other pending requests for this case
    UPDATE placement_requests
    SET status = 'cancelled'
    WHERE case_id = v_request.case_id
      AND id != p_request_id
      AND status = 'pending';

    -- Log audit
    PERFORM log_audit_action(
      'assignment_created',
      p_carer_id,
      'placement_request',
      p_request_id,
      jsonb_build_object('action', 'accepted', 'case_id', v_request.case_id)
    );
  ELSE
    -- Decline the request
    UPDATE placement_requests
    SET status = 'declined',
        responded_by = p_carer_id,
        response_message = p_response_message,
        responded_at = NOW()
    WHERE id = p_request_id;

    -- Log audit
    PERFORM log_audit_action(
      'assignment_removed',
      p_carer_id,
      'placement_request',
      p_request_id,
      jsonb_build_object('action', 'declined', 'case_id', v_request.case_id)
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update household availability
CREATE OR REPLACE FUNCTION update_household_availability(
  p_carer_id UUID,
  p_availability_status availability_status,
  p_away_from TIMESTAMPTZ DEFAULT NULL,
  p_away_until TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Get carer's household
  SELECT household_id INTO v_household_id
  FROM profiles WHERE id = p_carer_id;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a household';
  END IF;

  -- Update availability
  UPDATE households
  SET availability_status = p_availability_status,
      away_from = p_away_from,
      away_until = p_away_until,
      availability_notes = p_notes,
      updated_at = NOW()
  WHERE id = v_household_id;

  -- Log audit
  PERFORM log_audit_action(
    'profile_updated',
    p_carer_id,
    'household',
    v_household_id,
    jsonb_build_object(
      'availability_status', p_availability_status,
      'away_from', p_away_from,
      'away_until', p_away_until
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update household capacity
DROP FUNCTION IF EXISTS update_household_capacity(UUID, INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION update_household_capacity(
  p_carer_id UUID,
  p_total_bedrooms INTEGER,
  p_allows_house_sharing BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
  v_household_id UUID;
  v_is_primary BOOLEAN;
BEGIN
  -- Get carer's household and check if primary
  SELECT household_id, is_primary_carer
  INTO v_household_id, v_is_primary
  FROM profiles WHERE id = p_carer_id;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to a household';
  END IF;

  IF NOT v_is_primary THEN
    RAISE EXCEPTION 'Only the primary carer can update household capacity';
  END IF;

  IF p_total_bedrooms < 1 THEN
    RAISE EXCEPTION 'Household must have at least 1 bedroom';
  END IF;

  -- Update capacity
  UPDATE households
  SET total_bedrooms = p_total_bedrooms,
      allows_house_sharing = p_allows_house_sharing,
      updated_at = NOW()
  WHERE id = v_household_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending requests for a household
DROP FUNCTION IF EXISTS get_household_pending_requests(UUID);
CREATE OR REPLACE FUNCTION get_household_pending_requests(p_household_id UUID)
RETURNS TABLE (
  request_id UUID,
  case_number TEXT,
  placement_type placement_type,
  child_can_share BOOLEAN,
  child_age_range TEXT,
  social_worker_name TEXT,
  message TEXT,
  expected_start_date DATE,
  expected_end_date DATE,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id AS request_id,
    c.case_number,
    pr.placement_type,
    c.child_can_share,
    c.child_age_range,
    p.full_name AS social_worker_name,
    pr.message,
    pr.expected_start_date,
    pr.expected_end_date,
    pr.created_at,
    pr.expires_at
  FROM placement_requests pr
  JOIN cases c ON c.id = pr.case_id
  JOIN profiles p ON p.id = pr.requested_by
  WHERE pr.household_id = p_household_id
    AND pr.status = 'pending'
    AND pr.expires_at > NOW()
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD NEW AUDIT ACTIONS
-- ============================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'placement_request_sent';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'placement_request_accepted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'placement_request_declined';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'household_availability_updated';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON placement_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_available_beds TO authenticated;
GRANT EXECUTE ON FUNCTION is_household_available TO authenticated;
GRANT EXECUTE ON FUNCTION search_available_households TO authenticated;
GRANT EXECUTE ON FUNCTION create_case TO authenticated;
GRANT EXECUTE ON FUNCTION send_placement_request TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_placement_request TO authenticated;
GRANT EXECUTE ON FUNCTION update_household_availability TO authenticated;
GRANT EXECUTE ON FUNCTION update_household_capacity TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_pending_requests TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE placement_requests IS 'Requests from social workers to households for child placement';
COMMENT ON COLUMN households.total_bedrooms IS 'Number of bedrooms available for fostering';
COMMENT ON COLUMN households.availability_status IS 'Current availability: available, away, or full';
COMMENT ON COLUMN cases.placement_type IS 'Type of placement: respite, long_term, or emergency';
COMMENT ON COLUMN cases.child_can_share IS 'Whether this child can share the house with other foster children';
COMMENT ON FUNCTION get_household_available_beds IS 'Calculate available beds considering active cases and sharing rules';
COMMENT ON FUNCTION search_available_households IS 'Search for households available to accept a placement';
