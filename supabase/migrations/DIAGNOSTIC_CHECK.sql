-- ============================================
-- DIAGNOSTIC CHECK
-- Run this in Supabase SQL Editor to diagnose the RLS recursion issue
-- Run each query separately to see results
-- ============================================

-- 1. Check if user_role() function exists and its definition
SELECT pg_get_functiondef('public.user_role()'::regprocedure);

-- 2. Check if user_organization() function exists and its definition  
SELECT pg_get_functiondef('public.user_organization()'::regprocedure);

-- 3. Check all RLS policies on profiles table
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;

-- 4. Check if the functions query the profiles table (look for "FROM profiles" in output)
-- If you see "SELECT role FROM profiles" or "SELECT organization_id FROM profiles", 
-- that's the cause of the recursion!
