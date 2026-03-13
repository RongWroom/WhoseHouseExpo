-- ============================================
-- Backfill Legacy Cases -> Child Profiles
-- ============================================

WITH legacy_cases AS (
  SELECT
    c.id AS case_id,
    c.case_number,
    c.social_worker_id,
    p.organization_id,
    c.child_gender,
    c.internal_notes,
    c.created_at,
    c.updated_at
  FROM cases c
  JOIN profiles p ON p.id = c.social_worker_id
  WHERE c.child_profile_id IS NULL
),
inserted_profiles AS (
  INSERT INTO child_profiles (
    pid,
    organization_id,
    created_by,
    status,
    sex_at_birth,
    summary,
    created_at,
    updated_at
  )
  SELECT
    'LEGACY-' || lc.case_number,
    lc.organization_id,
    lc.social_worker_id,
    'active',
    CASE
      WHEN lc.child_gender IN ('male', 'female') THEN lc.child_gender
      ELSE NULL
    END,
    CASE
      WHEN lc.internal_notes IS NULL OR btrim(lc.internal_notes) = '' THEN NULL
      ELSE 'Legacy backfill from case notes'
    END,
    lc.created_at,
    lc.updated_at
  FROM legacy_cases lc
  ON CONFLICT (organization_id, pid)
  DO UPDATE SET
    updated_at = NOW()
  RETURNING id, pid, organization_id, created_by
)
UPDATE cases c
SET child_profile_id = cp.id
FROM child_profiles cp, profiles p
WHERE c.child_profile_id IS NULL
  AND p.id = c.social_worker_id
  AND cp.organization_id = p.organization_id
  AND cp.pid = 'LEGACY-' || c.case_number;

-- Add child needs backfill from internal notes where useful
INSERT INTO child_needs (
  child_profile_id,
  support_required,
  created_at,
  updated_at
)
SELECT
  c.child_profile_id,
  CASE
    WHEN c.internal_notes IS NULL OR btrim(c.internal_notes) = '' THEN NULL
    ELSE c.internal_notes
  END,
  c.created_at,
  c.updated_at
FROM cases c
WHERE c.child_profile_id IS NOT NULL
  AND c.internal_notes IS NOT NULL
  AND btrim(c.internal_notes) != ''
  AND NOT EXISTS (
    SELECT 1
    FROM child_needs n
    WHERE n.child_profile_id = c.child_profile_id
  );
