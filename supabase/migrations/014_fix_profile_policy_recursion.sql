-- Fix infinite recursion in profiles RLS policy
-- The "Users can update own profile" policy contains direct subqueries
-- that bypass our JWT-based helper functions

-- Replace the problematic policy with one that uses our JWT helpers
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Use JWT-based helpers instead of direct subqueries
    role = public.user_role() AND
    organization_id = public.user_organization()
  );

-- Also fix the "Social workers view org profiles" policy
-- which has similar subquery issues
DROP POLICY IF EXISTS "Social workers view org profiles" ON profiles;

CREATE POLICY "Social workers view org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.is_social_worker() AND 
    organization_id = public.user_organization()
  );

-- Fix the "Admins view all org profiles" policy
DROP POLICY IF EXISTS "Admins view all org profiles" ON profiles;

CREATE POLICY "Admins view all org profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.is_admin() AND 
    organization_id = public.user_organization()
  );

-- And the "Admins manage org profiles" policy
DROP POLICY IF EXISTS "Admins manage org profiles" ON profiles;

CREATE POLICY "Admins manage org profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    public.is_admin() AND 
    organization_id = public.user_organization()
  )
  WITH CHECK (
    public.is_admin() AND 
    -- Allow role changes for admins but restrict organization changes
    organization_id = public.user_organization()
  );
