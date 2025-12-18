-- ============================================
-- Fix RLS Infinite Recursion & Schema Issues
-- ============================================

-- ISSUE 1: Fix infinite recursion in profiles RLS policies
-- The problem is that user_role() and user_organization() functions
-- query the profiles table, which triggers RLS policies that call
-- those same functions, creating infinite recursion.

-- Solution: Drop and recreate helper functions with direct auth.uid() checks
-- that bypass RLS by using SECURITY DEFINER and setting search_path

-- Drop existing helper functions
DROP FUNCTION IF EXISTS public.user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_social_worker() CASCADE;
DROP FUNCTION IF EXISTS public.is_foster_carer() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.user_organization() CASCADE;

-- Recreate with proper security context to avoid recursion
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_social_worker()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN v_role = 'social_worker';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_foster_carer()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN v_role = 'foster_carer';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
SET row_security = off;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
SET row_security = off;

CREATE OR REPLACE FUNCTION public.user_organization()
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
SET row_security = off;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_social_worker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_foster_carer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization() TO authenticated;

-- ISSUE 2: Add missing columns to case_media table
-- The table has 'uploaded_at' but code expects 'created_at'
-- Also add file_name and file_path columns that are referenced in the code

-- Check if columns exist before adding them
DO $$ 
BEGIN
  -- Add file_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'case_media' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE case_media ADD COLUMN file_name TEXT;
  END IF;

  -- Add file_path if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'case_media' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE case_media ADD COLUMN file_path TEXT;
  END IF;

  -- Add created_at as alias to uploaded_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'case_media' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE case_media ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    -- Copy existing uploaded_at values to created_at
    UPDATE case_media SET created_at = uploaded_at WHERE created_at IS NULL;
  END IF;
END $$;

-- Add index for created_at lookups
CREATE INDEX IF NOT EXISTS idx_case_media_created_at ON case_media(created_at DESC);

-- Update existing records to ensure file_path is set from file_url if needed
UPDATE case_media 
SET file_path = file_url 
WHERE file_path IS NULL AND file_url IS NOT NULL;

COMMENT ON COLUMN case_media.created_at IS 'Timestamp when media was created (alias for uploaded_at for backwards compatibility)';
COMMENT ON COLUMN case_media.file_name IS 'Original filename of the uploaded media';
COMMENT ON COLUMN case_media.file_path IS 'Storage path for the media file';
