-- ============================================
-- Allow saving cases as draft
-- ============================================
-- Adds p_status parameter to create_case function

-- Drop the old function signature first (7 parameters)
DROP FUNCTION IF EXISTS create_case(UUID, placement_type, BOOLEAN, TEXT, TEXT, TEXT, DATE);

-- Create the function with status parameter (8 parameters)
CREATE OR REPLACE FUNCTION create_case(
  p_social_worker_id UUID,
  p_placement_type placement_type DEFAULT 'long_term',
  p_child_can_share BOOLEAN DEFAULT true,
  p_child_age_range TEXT DEFAULT NULL,
  p_child_gender TEXT DEFAULT NULL,
  p_internal_notes TEXT DEFAULT NULL,
  p_expected_end_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  v_case_id UUID;
  v_case_number TEXT;
  v_org_id UUID;
  v_final_status TEXT;
BEGIN
  -- Verify caller is a social worker
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_social_worker_id AND role = 'social_worker'
  ) THEN
    RAISE EXCEPTION 'Only social workers can create cases';
  END IF;

  -- Validate status
  v_final_status := COALESCE(p_status, 'pending');
  IF v_final_status NOT IN ('draft', 'pending', 'active') THEN
    v_final_status := 'pending';
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
    v_final_status,
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
      'child_can_share', p_child_can_share,
      'status', v_final_status
    )
  );

  RETURN v_case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_case TO authenticated;

COMMENT ON FUNCTION create_case IS 'Create a new case with optional draft status';
