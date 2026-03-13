-- ============================================
-- Child Domain Upsert Functions
-- ============================================

CREATE OR REPLACE FUNCTION upsert_child_needs(
  p_child_profile_id UUID,
  p_education_summary TEXT DEFAULT NULL,
  p_health_summary TEXT DEFAULT NULL,
  p_communication_summary TEXT DEFAULT NULL,
  p_emotional_summary TEXT DEFAULT NULL,
  p_physical_summary TEXT DEFAULT NULL,
  p_cultural_summary TEXT DEFAULT NULL,
  p_self_care_summary TEXT DEFAULT NULL,
  p_support_required TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_needs_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM child_profiles cp
    JOIN profiles p ON p.id = auth.uid()
    WHERE cp.id = p_child_profile_id
      AND p.role = 'social_worker'
      AND cp.organization_id = p.organization_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized child profile access';
  END IF;

  INSERT INTO child_needs (
    child_profile_id,
    education_summary,
    health_summary,
    communication_summary,
    emotional_summary,
    physical_summary,
    cultural_summary,
    self_care_summary,
    support_required
  ) VALUES (
    p_child_profile_id,
    p_education_summary,
    p_health_summary,
    p_communication_summary,
    p_emotional_summary,
    p_physical_summary,
    p_cultural_summary,
    p_self_care_summary,
    p_support_required
  )
  ON CONFLICT (child_profile_id)
  DO UPDATE SET
    education_summary = EXCLUDED.education_summary,
    health_summary = EXCLUDED.health_summary,
    communication_summary = EXCLUDED.communication_summary,
    emotional_summary = EXCLUDED.emotional_summary,
    physical_summary = EXCLUDED.physical_summary,
    cultural_summary = EXCLUDED.cultural_summary,
    self_care_summary = EXCLUDED.self_care_summary,
    support_required = EXCLUDED.support_required,
    updated_at = NOW()
  RETURNING id INTO v_needs_id;

  PERFORM log_audit_action(
    'profile_updated',
    auth.uid(),
    'child_needs',
    v_needs_id,
    jsonb_build_object('child_profile_id', p_child_profile_id)
  );

  RETURN v_needs_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_child_risk(
  p_child_profile_id UUID,
  p_risk_type TEXT,
  p_has_risk BOOLEAN DEFAULT false,
  p_details TEXT DEFAULT NULL,
  p_known_triggers TEXT DEFAULT NULL,
  p_successful_strategies TEXT DEFAULT NULL,
  p_last_incident_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_risk_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM child_profiles cp
    JOIN profiles p ON p.id = auth.uid()
    WHERE cp.id = p_child_profile_id
      AND p.role = 'social_worker'
      AND cp.organization_id = p.organization_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized child profile access';
  END IF;

  INSERT INTO child_risks (
    child_profile_id,
    risk_type,
    has_risk,
    details,
    known_triggers,
    successful_strategies,
    last_incident_at
  ) VALUES (
    p_child_profile_id,
    p_risk_type,
    COALESCE(p_has_risk, false),
    p_details,
    p_known_triggers,
    p_successful_strategies,
    p_last_incident_at
  )
  ON CONFLICT (child_profile_id, risk_type)
  DO UPDATE SET
    has_risk = EXCLUDED.has_risk,
    details = EXCLUDED.details,
    known_triggers = EXCLUDED.known_triggers,
    successful_strategies = EXCLUDED.successful_strategies,
    last_incident_at = EXCLUDED.last_incident_at,
    updated_at = NOW()
  RETURNING id INTO v_risk_id;

  PERFORM log_audit_action(
    'profile_updated',
    auth.uid(),
    'child_risks',
    v_risk_id,
    jsonb_build_object('child_profile_id', p_child_profile_id, 'risk_type', p_risk_type)
  );

  RETURN v_risk_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_child_family_time(
  p_child_profile_id UUID,
  p_contact_person TEXT,
  p_frequency TEXT DEFAULT NULL,
  p_preferred_location TEXT DEFAULT NULL,
  p_supervised BOOLEAN DEFAULT false,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_family_time_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM child_profiles cp
    JOIN profiles p ON p.id = auth.uid()
    WHERE cp.id = p_child_profile_id
      AND p.role = 'social_worker'
      AND cp.organization_id = p.organization_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized child profile access';
  END IF;

  DELETE FROM child_family_time
  WHERE child_profile_id = p_child_profile_id
    AND contact_person = p_contact_person;

  INSERT INTO child_family_time (
    child_profile_id,
    contact_person,
    frequency,
    preferred_location,
    supervised,
    notes
  ) VALUES (
    p_child_profile_id,
    p_contact_person,
    p_frequency,
    p_preferred_location,
    COALESCE(p_supervised, false),
    p_notes
  ) RETURNING id INTO v_family_time_id;

  PERFORM log_audit_action(
    'profile_updated',
    auth.uid(),
    'child_family_time',
    v_family_time_id,
    jsonb_build_object('child_profile_id', p_child_profile_id, 'contact_person', p_contact_person)
  );

  RETURN v_family_time_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_child_needs(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_child_risk(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_child_family_time(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
