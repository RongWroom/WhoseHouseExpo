-- ============================================
-- Fix recursive RLS helpers for profiles
-- ============================================

-- The previous implementation of user_role() and user_organization()
-- selected from the profiles table which is protected by RLS policies
-- that reference these helper functions. This caused PostgreSQL to
-- detect infinite recursion when evaluating the policies. We now read
-- the required values directly from the authenticated JWT claims,
-- avoiding any table access during policy evaluation.

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
  IF jwt_claims ? 'role' THEN
    role_text := jwt_claims ->> 'role';
  ELSIF jwt_claims ? 'app_metadata' AND (jwt_claims -> 'app_metadata') ? 'role' THEN
    role_text := (jwt_claims -> 'app_metadata') ->> 'role';
  ELSIF jwt_claims ? 'user_metadata' AND (jwt_claims -> 'user_metadata') ? 'role' THEN
    role_text := (jwt_claims -> 'user_metadata') ->> 'role';
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
  IF jwt_claims ? 'organization_id' THEN
    org_text := jwt_claims ->> 'organization_id';
  ELSIF jwt_claims ? 'app_metadata' AND (jwt_claims -> 'app_metadata') ? 'organization_id' THEN
    org_text := (jwt_claims -> 'app_metadata') ->> 'organization_id';
  ELSIF jwt_claims ? 'user_metadata' AND (jwt_claims -> 'user_metadata') ? 'organization_id' THEN
    org_text := (jwt_claims -> 'user_metadata') ->> 'organization_id';
  END IF;

  IF org_text IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN org_text::uuid;
END;
$$;
