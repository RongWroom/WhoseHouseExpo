-- ============================================
-- Child Profile + Referral Foundation
-- ============================================

-- ============================================
-- CHILD PROFILE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pid TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  date_of_birth DATE,
  sex_at_birth TEXT,
  gender_identity TEXT,
  ethnicity TEXT,
  legal_status TEXT,
  summary TEXT,
  pen_picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT child_profiles_status_valid CHECK (status IN ('active', 'archived')),
  CONSTRAINT child_profiles_org_pid_unique UNIQUE (organization_id, pid)
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_org ON child_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_child_profiles_created_by ON child_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_child_profiles_pid ON child_profiles(pid);

CREATE TABLE IF NOT EXISTS child_needs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_profile_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  education_summary TEXT,
  health_summary TEXT,
  communication_summary TEXT,
  emotional_summary TEXT,
  physical_summary TEXT,
  cultural_summary TEXT,
  self_care_summary TEXT,
  support_required TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT child_needs_unique_profile UNIQUE (child_profile_id)
);

CREATE TABLE IF NOT EXISTS child_risks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_profile_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  risk_type TEXT NOT NULL,
  has_risk BOOLEAN DEFAULT false NOT NULL,
  details TEXT,
  known_triggers TEXT,
  successful_strategies TEXT,
  last_incident_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT child_risks_unique_type UNIQUE (child_profile_id, risk_type)
);

CREATE INDEX IF NOT EXISTS idx_child_risks_profile ON child_risks(child_profile_id);

CREATE TABLE IF NOT EXISTS child_family_time (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_profile_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  contact_person TEXT NOT NULL,
  frequency TEXT,
  preferred_location TEXT,
  supervised BOOLEAN DEFAULT false NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_child_family_time_profile ON child_family_time(child_profile_id);

-- ============================================
-- CASE / REQUEST EXTENSIONS
-- ============================================

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS child_profile_id UUID REFERENCES child_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cases_child_profile_id ON cases(child_profile_id);

CREATE TABLE IF NOT EXISTS placement_referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  child_profile_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' NOT NULL,
  referral_request_date DATE,
  completed_by_name TEXT,
  completed_by_contact TEXT,
  manager_approval_granted BOOLEAN DEFAULT false NOT NULL,
  manager_approved_by TEXT,
  manager_approved_at DATE,
  anonymized_snapshot JSONB DEFAULT '{}'::jsonb NOT NULL,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT placement_referrals_status_valid CHECK (status IN ('draft', 'sent', 'withdrawn')),
  CONSTRAINT placement_referrals_case_version_unique UNIQUE (case_id, version)
);

CREATE INDEX IF NOT EXISTS idx_placement_referrals_case ON placement_referrals(case_id);
CREATE INDEX IF NOT EXISTS idx_placement_referrals_status ON placement_referrals(status);

ALTER TABLE placement_requests
  ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES placement_referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_placement_requests_referral_id ON placement_requests(referral_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_family_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS child_profiles_social_worker_select ON child_profiles;
CREATE POLICY child_profiles_social_worker_select ON child_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (p.role = 'social_worker' AND p.organization_id = child_profiles.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS child_profiles_social_worker_insert ON child_profiles;
CREATE POLICY child_profiles_social_worker_insert ON child_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'social_worker'
        AND p.organization_id = child_profiles.organization_id
    )
  );

DROP POLICY IF EXISTS child_profiles_social_worker_update ON child_profiles;
CREATE POLICY child_profiles_social_worker_update ON child_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'admin'
          OR (p.role = 'social_worker' AND p.organization_id = child_profiles.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS child_domain_social_worker_select ON child_needs;
CREATE POLICY child_domain_social_worker_select ON child_needs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_needs.child_profile_id
        AND (
          p.role = 'admin'
          OR (p.role = 'social_worker' AND p.organization_id = cp.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS child_domain_social_worker_modify ON child_needs;
CREATE POLICY child_domain_social_worker_modify ON child_needs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_needs.child_profile_id
        AND p.role = 'social_worker'
        AND p.organization_id = cp.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_needs.child_profile_id
        AND p.role = 'social_worker'
        AND p.organization_id = cp.organization_id
    )
  );

DROP POLICY IF EXISTS child_risks_social_worker_select ON child_risks;
CREATE POLICY child_risks_social_worker_select ON child_risks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_risks.child_profile_id
        AND (
          p.role = 'admin'
          OR (p.role = 'social_worker' AND p.organization_id = cp.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS child_risks_social_worker_modify ON child_risks;
CREATE POLICY child_risks_social_worker_modify ON child_risks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_risks.child_profile_id
        AND p.role = 'social_worker'
        AND p.organization_id = cp.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_risks.child_profile_id
        AND p.role = 'social_worker'
        AND p.organization_id = cp.organization_id
    )
  );

DROP POLICY IF EXISTS child_family_time_social_worker_select ON child_family_time;
CREATE POLICY child_family_time_social_worker_select ON child_family_time
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_family_time.child_profile_id
        AND (
          p.role = 'admin'
          OR (p.role = 'social_worker' AND p.organization_id = cp.organization_id)
        )
    )
  );

DROP POLICY IF EXISTS child_family_time_social_worker_modify ON child_family_time;
CREATE POLICY child_family_time_social_worker_modify ON child_family_time
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_family_time.child_profile_id
        AND p.role = 'social_worker'
        AND p.organization_id = cp.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM child_profiles cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = child_family_time.child_profile_id
        AND p.role = 'social_worker'
        AND p.organization_id = cp.organization_id
    )
  );

DROP POLICY IF EXISTS placement_referrals_social_worker_select ON placement_referrals;
CREATE POLICY placement_referrals_social_worker_select ON placement_referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cases c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = placement_referrals.case_id
        AND (
          p.role = 'admin'
          OR (p.role = 'social_worker' AND c.social_worker_id = auth.uid())
        )
    )
    OR EXISTS (
      SELECT 1
      FROM placement_requests pr
      JOIN profiles p ON p.id = auth.uid()
      WHERE pr.referral_id = placement_referrals.id
        AND p.role = 'foster_carer'
        AND pr.household_id = p.household_id
    )
  );

DROP POLICY IF EXISTS placement_referrals_social_worker_modify ON placement_referrals;
CREATE POLICY placement_referrals_social_worker_modify ON placement_referrals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM cases c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = placement_referrals.case_id
        AND p.role = 'social_worker'
        AND c.social_worker_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM cases c
      JOIN profiles p ON p.id = auth.uid()
      WHERE c.id = placement_referrals.case_id
        AND p.role = 'social_worker'
        AND c.social_worker_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION create_child_profile(
  p_pid TEXT,
  p_date_of_birth DATE DEFAULT NULL,
  p_sex_at_birth TEXT DEFAULT NULL,
  p_gender_identity TEXT DEFAULT NULL,
  p_ethnicity TEXT DEFAULT NULL,
  p_legal_status TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_pen_picture TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_child_profile_id UUID;
  v_org_id UUID;
BEGIN
  SELECT organization_id
  INTO v_org_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'social_worker';

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Only social workers can create child profiles';
  END IF;

  INSERT INTO child_profiles (
    pid,
    organization_id,
    created_by,
    date_of_birth,
    sex_at_birth,
    gender_identity,
    ethnicity,
    legal_status,
    summary,
    pen_picture
  ) VALUES (
    p_pid,
    v_org_id,
    auth.uid(),
    p_date_of_birth,
    p_sex_at_birth,
    p_gender_identity,
    p_ethnicity,
    p_legal_status,
    p_summary,
    p_pen_picture
  ) RETURNING id INTO v_child_profile_id;

  PERFORM log_audit_action(
    'case_created',
    auth.uid(),
    'child_profile',
    v_child_profile_id,
    jsonb_build_object('pid', p_pid)
  );

  RETURN v_child_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_case_for_child(
  p_child_profile_id UUID,
  p_placement_type placement_type DEFAULT 'long_term',
  p_child_can_share BOOLEAN DEFAULT true,
  p_internal_notes TEXT DEFAULT NULL,
  p_expected_end_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  v_case_id UUID;
  v_case_number TEXT;
  v_profile RECORD;
  v_final_status TEXT;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid() AND role = 'social_worker';

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Only social workers can create cases';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM child_profiles cp
    WHERE cp.id = p_child_profile_id
      AND cp.organization_id = v_profile.organization_id
  ) THEN
    RAISE EXCEPTION 'Child profile is not in your organization';
  END IF;

  v_final_status := COALESCE(p_status, 'pending');
  IF v_final_status NOT IN ('draft', 'pending', 'active') THEN
    v_final_status := 'pending';
  END IF;

  v_case_number := 'WH-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  WHILE EXISTS (SELECT 1 FROM cases WHERE case_number = v_case_number) LOOP
    v_case_number := 'WH-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END LOOP;

  INSERT INTO cases (
    case_number,
    social_worker_id,
    child_profile_id,
    status,
    placement_type,
    child_can_share,
    internal_notes,
    expected_end_date
  ) VALUES (
    v_case_number,
    auth.uid(),
    p_child_profile_id,
    v_final_status,
    p_placement_type,
    p_child_can_share,
    p_internal_notes,
    p_expected_end_date
  ) RETURNING id INTO v_case_id;

  PERFORM log_audit_action(
    'case_created',
    auth.uid(),
    'case',
    v_case_id,
    jsonb_build_object('case_number', v_case_number, 'child_profile_id', p_child_profile_id)
  );

  RETURN v_case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_placement_referral(
  p_case_id UUID,
  p_referral_request_date DATE DEFAULT NULL,
  p_completed_by_name TEXT DEFAULT NULL,
  p_completed_by_contact TEXT DEFAULT NULL,
  p_manager_approval_granted BOOLEAN DEFAULT false,
  p_manager_approved_by TEXT DEFAULT NULL,
  p_manager_approved_at DATE DEFAULT NULL,
  p_additional_snapshot JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_referral_id UUID;
  v_case RECORD;
  v_child RECORD;
  v_next_version INTEGER;
  v_snapshot JSONB;
BEGIN
  SELECT c.*, p.organization_id
  INTO v_case
  FROM cases c
  JOIN profiles p ON p.id = auth.uid()
  WHERE c.id = p_case_id
    AND c.social_worker_id = auth.uid()
    AND p.role = 'social_worker';

  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Case not found or unauthorized';
  END IF;

  SELECT * INTO v_child
  FROM child_profiles
  WHERE id = v_case.child_profile_id;

  IF v_child.id IS NULL THEN
    RAISE EXCEPTION 'Case must have a child profile before referral';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM placement_referrals
  WHERE case_id = p_case_id;

  v_snapshot := jsonb_build_object(
    'case_number', v_case.case_number,
    'placement_type', v_case.placement_type,
    'child_can_share', v_case.child_can_share,
    'child_age', CASE WHEN v_child.date_of_birth IS NULL THEN NULL ELSE EXTRACT(YEAR FROM age(current_date, v_child.date_of_birth))::INT END,
    'sex_at_birth', v_child.sex_at_birth,
    'gender_identity', v_child.gender_identity,
    'ethnicity', v_child.ethnicity,
    'legal_status', v_child.legal_status,
    'summary', v_child.summary,
    'pen_picture', v_child.pen_picture,
    'internal_notes_excluded', true
  ) || COALESCE(p_additional_snapshot, '{}'::jsonb);

  INSERT INTO placement_referrals (
    case_id,
    child_profile_id,
    version,
    status,
    referral_request_date,
    completed_by_name,
    completed_by_contact,
    manager_approval_granted,
    manager_approved_by,
    manager_approved_at,
    anonymized_snapshot,
    created_by
  ) VALUES (
    p_case_id,
    v_child.id,
    v_next_version,
    'draft',
    p_referral_request_date,
    p_completed_by_name,
    p_completed_by_contact,
    p_manager_approval_granted,
    p_manager_approved_by,
    p_manager_approved_at,
    v_snapshot,
    auth.uid()
  ) RETURNING id INTO v_referral_id;

  PERFORM log_audit_action(
    'placement_request_sent',
    auth.uid(),
    'placement_referral',
    v_referral_id,
    jsonb_build_object('case_id', p_case_id, 'status', 'draft')
  );

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION send_placement_referral(
  p_referral_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_ref RECORD;
BEGIN
  SELECT pr.*
  INTO v_ref
  FROM placement_referrals pr
  JOIN cases c ON c.id = pr.case_id
  WHERE pr.id = p_referral_id
    AND c.social_worker_id = auth.uid();

  IF v_ref.id IS NULL THEN
    RAISE EXCEPTION 'Referral not found or unauthorized';
  END IF;

  IF COALESCE(v_ref.anonymized_snapshot, '{}'::jsonb) = '{}'::jsonb THEN
    RAISE EXCEPTION 'Referral anonymized snapshot is required before sending';
  END IF;

  UPDATE placement_referrals
  SET status = 'sent',
      sent_at = NOW(),
      updated_at = NOW()
  WHERE id = p_referral_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing placement request functions to include referral linkage.
DROP FUNCTION IF EXISTS send_placement_request(UUID, UUID, UUID, TEXT, DATE, DATE);
CREATE OR REPLACE FUNCTION send_placement_request(
  p_social_worker_id UUID,
  p_case_id UUID,
  p_household_id UUID,
  p_message TEXT DEFAULT NULL,
  p_expected_start_date DATE DEFAULT NULL,
  p_expected_end_date DATE DEFAULT NULL,
  p_referral_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_case cases%ROWTYPE;
BEGIN
  SELECT * INTO v_case FROM cases WHERE id = p_case_id;

  IF v_case.id IS NULL THEN
    RAISE EXCEPTION 'Case not found';
  END IF;

  IF v_case.social_worker_id != p_social_worker_id THEN
    RAISE EXCEPTION 'You can only send requests for your own cases';
  END IF;

  IF v_case.status != 'pending' THEN
    RAISE EXCEPTION 'Case is already assigned or closed';
  END IF;

  IF p_referral_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM placement_referrals pr
      WHERE pr.id = p_referral_id
        AND pr.case_id = p_case_id
        AND pr.status = 'sent'
    ) THEN
      RAISE EXCEPTION 'Referral must exist and be sent before request';
    END IF;
  END IF;

  IF NOT is_household_available(p_household_id, v_case.child_can_share) THEN
    RAISE EXCEPTION 'Household is not available for this placement';
  END IF;

  IF EXISTS (
    SELECT 1 FROM placement_requests
    WHERE case_id = p_case_id
      AND household_id = p_household_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending request already exists for this household';
  END IF;

  INSERT INTO placement_requests (
    case_id,
    household_id,
    requested_by,
    placement_type,
    message,
    expected_start_date,
    expected_end_date,
    referral_id
  ) VALUES (
    p_case_id,
    p_household_id,
    p_social_worker_id,
    v_case.placement_type,
    p_message,
    p_expected_start_date,
    COALESCE(p_expected_end_date, v_case.expected_end_date),
    p_referral_id
  ) RETURNING id INTO v_request_id;

  PERFORM log_audit_action(
    'assignment_created',
    p_social_worker_id,
    'placement_request',
    v_request_id,
    jsonb_build_object('case_id', p_case_id, 'household_id', p_household_id, 'action', 'request_sent')
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_household_pending_requests(UUID);
CREATE OR REPLACE FUNCTION get_household_pending_requests(p_household_id UUID)
RETURNS TABLE (
  request_id UUID,
  case_number TEXT,
  placement_type placement_type,
  child_can_share BOOLEAN,
  child_age TEXT,
  social_worker_name TEXT,
  message TEXT,
  expected_start_date DATE,
  expected_end_date DATE,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  referral_id UUID,
  referral_pen_picture TEXT,
  referral_summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id AS request_id,
    c.case_number,
    pr.placement_type,
    c.child_can_share,
    COALESCE(NULLIF(r.anonymized_snapshot->>'child_age', ''), c.child_age_range) AS child_age,
    p.full_name AS social_worker_name,
    pr.message,
    pr.expected_start_date,
    pr.expected_end_date,
    pr.created_at,
    pr.expires_at,
    pr.referral_id,
    COALESCE(r.anonymized_snapshot->>'pen_picture', '') AS referral_pen_picture,
    COALESCE(r.anonymized_snapshot->>'summary', '') AS referral_summary
  FROM placement_requests pr
  JOIN cases c ON c.id = pr.case_id
  JOIN profiles p ON p.id = pr.requested_by
  LEFT JOIN placement_referrals r ON r.id = pr.referral_id
  WHERE pr.household_id = p_household_id
    AND pr.status = 'pending'
    AND pr.expires_at > NOW()
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION create_child_profile(TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_case_for_child(UUID, placement_type, BOOLEAN, TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_placement_referral(UUID, DATE, TEXT, TEXT, BOOLEAN, TEXT, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION send_placement_referral(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_placement_request(UUID, UUID, UUID, TEXT, DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_household_pending_requests(UUID) TO authenticated;
