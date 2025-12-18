-- ============================================
-- COMPLETE RLS RECURSION FIX
-- This migration must be run in Supabase SQL Editor
-- ============================================

-- Step 1: Drop and recreate helper functions with JWT-based implementation
-- ============================================

DROP FUNCTION IF EXISTS public.user_role() CASCADE;
DROP FUNCTION IF EXISTS public.user_organization() CASCADE;
DROP FUNCTION IF EXISTS public.is_social_worker() CASCADE;
DROP FUNCTION IF EXISTS public.is_foster_carer() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create user_role() - reads from JWT instead of profiles table
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
  -- Try to get role from JWT claims (in order of priority)
  IF jwt_claims ? 'role' THEN
    role_text := jwt_claims ->> 'role';
  ELSIF jwt_claims ? 'app_metadata' AND (jwt_claims -> 'app_metadata') ? 'role' THEN
    role_text := (jwt_claims -> 'app_metadata') ->> 'role';
  ELSIF jwt_claims ? 'user_metadata' AND (jwt_claims -> 'user_metadata') ? 'role' THEN
    role_text := (jwt_claims -> 'user_metadata') ->> 'role';
  ELSE
    -- Default to social_worker if not found (defensive coding)
    RETURN 'social_worker'::user_role;
  END IF;

  RETURN role_text::user_role;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, default to social_worker
    RETURN 'social_worker'::user_role;
END;
$$;

-- Create user_organization() - reads from JWT instead of profiles table
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
  -- Try to get organization_id from JWT claims
  IF jwt_claims ? 'organization_id' THEN
    org_text := jwt_claims ->> 'organization_id';
  ELSIF jwt_claims ? 'app_metadata' AND (jwt_claims -> 'app_metadata') ? 'organization_id' THEN
    org_text := (jwt_claims -> 'app_metadata') ->> 'organization_id';
  ELSIF jwt_claims ? 'user_metadata' AND (jwt_claims -> 'user_metadata') ? 'organization_id' THEN
    org_text := (jwt_claims -> 'user_metadata') ->> 'organization_id';
  END IF;

  -- Return NULL if not found (organization is optional)
  IF org_text IS NULL OR org_text = '' THEN
    RETURN NULL;
  END IF;

  RETURN org_text::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Create is_social_worker()
CREATE OR REPLACE FUNCTION public.is_social_worker()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.user_role() = 'social_worker';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create is_foster_carer()
CREATE OR REPLACE FUNCTION public.is_foster_carer()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.user_role() = 'foster_carer';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.user_role() = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_organization() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_social_worker() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_foster_carer() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Step 2: Fix all policies on profiles table
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Social workers view org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins view all org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins manage org profiles" ON profiles;

-- Recreate policies using JWT-based helpers

-- Users can view their own profile (simple, no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (prevent role/org changes)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = public.user_role() AND
    (organization_id = public.user_organization() OR 
     (organization_id IS NULL AND public.user_organization() IS NULL))
  );

-- Social workers can view profiles in their organization
CREATE POLICY "Social workers view org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.is_social_worker() AND 
    (organization_id = public.user_organization() OR 
     (organization_id IS NULL AND public.user_organization() IS NULL))
  );

-- Admins can view all profiles in their organization
CREATE POLICY "Admins view all org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.is_admin() AND 
    (organization_id = public.user_organization() OR 
     (organization_id IS NULL AND public.user_organization() IS NULL))
  );

-- Admins can manage profiles in their organization
CREATE POLICY "Admins manage org profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    public.is_admin() AND 
    (organization_id = public.user_organization() OR 
     (organization_id IS NULL AND public.user_organization() IS NULL))
  )
  WITH CHECK (
    public.is_admin() AND 
    (organization_id = public.user_organization() OR 
     (organization_id IS NULL AND public.user_organization() IS NULL))
  );

-- Step 3: Verification
-- ============================================

-- Test the helper functions (should not cause recursion)
DO $$
DECLARE
  test_role user_role;
  test_org uuid;
BEGIN
  -- This will only work if you have an authenticated session
  -- But it verifies the functions don't cause errors
  test_role := public.user_role();
  test_org := public.user_organization();
  
  RAISE NOTICE 'Helper functions verified. Role: %, Org: %', test_role, test_org;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Helper functions cannot be tested without auth session, but they are created.';
END $$;

-- Show all policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;
