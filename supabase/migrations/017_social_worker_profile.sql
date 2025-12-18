-- ============================================
-- Social Worker Professional Profile Fields
-- Migration: 017_social_worker_profile.sql
-- ============================================
-- Adds UK-specific professional fields for social workers
-- including SWE registration, employment details, and availability

-- ============================================
-- SOCIAL WORKER PROFILES TABLE
-- ============================================
-- Separate table for role-specific professional data
-- Keeps the main profiles table clean and allows different
-- fields for different roles in the future

CREATE TABLE IF NOT EXISTS social_worker_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Employment Details
  employer_name TEXT,                          -- Local authority or agency name
  team_name TEXT,                              -- e.g., "Fostering Team", "Children in Care Team"
  office_location TEXT,                        -- Base office address
  manager_name TEXT,                           -- Line manager name
  work_phone TEXT,                             -- Work mobile number

  -- Professional Registration (UK Specific)
  swe_registration_number TEXT,                -- Social Work England registration number
  swe_registration_expiry DATE,                -- Registration expiry date
  dbs_certificate_date DATE,                   -- DBS certificate issue date
  dbs_update_service BOOLEAN DEFAULT false,    -- Whether registered with DBS Update Service

  -- Working Pattern
  working_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '17:00',

  -- Availability
  is_on_leave BOOLEAN DEFAULT false,
  leave_start_date DATE,
  leave_end_date DATE,
  out_of_office_message TEXT,
  emergency_contact_name TEXT,                 -- Duty team or cover contact
  emergency_contact_phone TEXT,

  -- Service Area
  service_areas TEXT[],                        -- List of areas/regions served

  -- Qualifications (stored as JSONB for flexibility)
  qualifications JSONB DEFAULT '[]'::jsonb,    -- Array of {name, institution, year}

  -- Bio/About (visible to foster carers and children)
  bio TEXT,                                    -- Short professional bio
  specialisms TEXT[],                          -- Areas of expertise

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient lookups (use IF NOT EXISTS to be idempotent)
CREATE INDEX IF NOT EXISTS idx_sw_profiles_profile_id ON social_worker_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_sw_profiles_swe_number ON social_worker_profiles(swe_registration_number);
CREATE INDEX IF NOT EXISTS idx_sw_profiles_employer ON social_worker_profiles(employer_name);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_sw_profiles_updated_at ON social_worker_profiles;
CREATE TRIGGER update_sw_profiles_updated_at
  BEFORE UPDATE ON social_worker_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE social_worker_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to make migration idempotent
DROP POLICY IF EXISTS "Social workers can manage own profile" ON social_worker_profiles;
DROP POLICY IF EXISTS "Admins can view org social worker profiles" ON social_worker_profiles;
DROP POLICY IF EXISTS "Foster carers can view assigned SW profile" ON social_worker_profiles;

-- Social workers can view and edit their own profile
CREATE POLICY "Social workers can manage own profile"
  ON social_worker_profiles
  FOR ALL
  USING (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'social_worker'
    )
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'social_worker'
    )
  );

-- Admins can view all social worker profiles in their organization
CREATE POLICY "Admins can view org social worker profiles"
  ON social_worker_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'admin'
      AND admin.organization_id = (
        SELECT organization_id FROM profiles WHERE id = social_worker_profiles.profile_id
      )
    )
  );

-- Foster carers can view limited profile info of their assigned social worker
CREATE POLICY "Foster carers can view assigned SW profile"
  ON social_worker_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      JOIN profiles fc ON fc.id = c.foster_carer_id
      WHERE fc.id = auth.uid()
      AND fc.role = 'foster_carer'
      AND c.social_worker_id = social_worker_profiles.profile_id
      AND c.status = 'active'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get or create social worker profile
CREATE OR REPLACE FUNCTION get_or_create_sw_profile(p_profile_id UUID)
RETURNS UUID AS $$
DECLARE
  v_sw_profile_id UUID;
BEGIN
  -- Check if profile exists
  SELECT id INTO v_sw_profile_id
  FROM social_worker_profiles
  WHERE profile_id = p_profile_id;

  -- Create if not exists
  IF v_sw_profile_id IS NULL THEN
    INSERT INTO social_worker_profiles (profile_id)
    VALUES (p_profile_id)
    RETURNING id INTO v_sw_profile_id;
  END IF;

  RETURN v_sw_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if SWE registration is valid
CREATE OR REPLACE FUNCTION is_swe_registration_valid(p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_expiry DATE;
BEGIN
  SELECT swe_registration_expiry INTO v_expiry
  FROM social_worker_profiles
  WHERE profile_id = p_profile_id;

  IF v_expiry IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_expiry > CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if social worker is currently available
CREATE OR REPLACE FUNCTION is_social_worker_available(p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_on_leave BOOLEAN;
  v_leave_start DATE;
  v_leave_end DATE;
BEGIN
  SELECT is_on_leave, leave_start_date, leave_end_date
  INTO v_on_leave, v_leave_start, v_leave_end
  FROM social_worker_profiles
  WHERE profile_id = p_profile_id;

  -- If not on leave flag, they're available
  IF v_on_leave IS NULL OR v_on_leave = FALSE THEN
    RETURN TRUE;
  END IF;

  -- Check if current date is within leave period
  IF v_leave_start IS NOT NULL AND v_leave_end IS NOT NULL THEN
    RETURN NOT (CURRENT_DATE BETWEEN v_leave_start AND v_leave_end);
  END IF;

  -- If on leave but no dates, assume unavailable
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON social_worker_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_sw_profile TO authenticated;
GRANT EXECUTE ON FUNCTION is_swe_registration_valid TO authenticated;
GRANT EXECUTE ON FUNCTION is_social_worker_available TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE social_worker_profiles IS 'Extended professional profile data for social workers including UK-specific registration and employment details';
COMMENT ON COLUMN social_worker_profiles.swe_registration_number IS 'Social Work England registration number - required for practicing in England';
COMMENT ON COLUMN social_worker_profiles.dbs_certificate_date IS 'Date of Enhanced DBS certificate with barred list check';
COMMENT ON COLUMN social_worker_profiles.working_days IS 'Array of working days (lowercase): monday, tuesday, etc.';
COMMENT ON COLUMN social_worker_profiles.qualifications IS 'JSON array of qualifications: [{name, institution, year}]';
