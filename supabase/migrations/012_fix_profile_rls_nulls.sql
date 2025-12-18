-- Fix RLS policy for profiles to handle NULL organization_id
-- The original policy used equality (=) which fails when organization_id is NULL because NULL = NULL is not true in SQL
-- We use IS NOT DISTINCT FROM to correctly handle NULL equality

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent role changes
    role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()) AND
    -- Prevent organization changes
    organization_id IS NOT DISTINCT FROM (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
