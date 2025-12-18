-- ============================================
-- Drop and recreate RLS helper functions to clear cache
-- ============================================

-- Drop the functions to clear any cached versions (CASCADE to drop dependent policies too)
DROP FUNCTION IF EXISTS public.user_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_organization() CASCADE;
DROP FUNCTION IF EXISTS public.is_social_worker() CASCADE;
DROP FUNCTION IF EXISTS public.is_foster_carer() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Recreate with JWT-based implementation
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_claims jsonb := auth.jwt();
  role_text text;
BEGIN
  -- Check top level
  IF jwt_claims ? 'role' THEN
    role_text := jwt_claims ->> 'role';
  -- Check app_metadata
  ELSIF jwt_claims ? 'app_metadata' AND (jwt_claims -> 'app_metadata') ? 'role' THEN
    role_text := (jwt_claims -> 'app_metadata') ->> 'role';
  -- Check user_metadata
  ELSIF jwt_claims ? 'user_metadata' AND (jwt_claims -> 'user_metadata') ? 'role' THEN
    role_text := (jwt_claims -> 'user_metadata') ->> 'role';
  END IF;

  -- Return null if not found (should not happen for valid users)
  IF role_text IS NULL THEN
    RAISE EXCEPTION 'Role not found in JWT claims';
  END IF;

  RETURN role_text::user_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_organization()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_claims jsonb := auth.jwt();
  org_text text;
BEGIN
  -- Check top level
  IF jwt_claims ? 'organization_id' THEN
    org_text := jwt_claims ->> 'organization_id';
  -- Check app_metadata
  ELSIF jwt_claims ? 'app_metadata' AND (jwt_claims -> 'app_metadata') ? 'organization_id' THEN
    org_text := (jwt_claims -> 'app_metadata') ->> 'organization_id';
  -- Check user_metadata
  ELSIF jwt_claims ? 'user_metadata' AND (jwt_claims -> 'user_metadata') ? 'organization_id' THEN
    org_text := (jwt_claims -> 'user_metadata') ->> 'organization_id';
  END IF;

  IF org_text IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN org_text::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_social_worker()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_role() = 'social_worker';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_foster_carer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_role() = 'foster_carer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
