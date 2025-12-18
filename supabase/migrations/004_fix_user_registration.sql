-- ============================================
-- Fix User Registration - Make Organization Optional & Bypass RLS
-- ============================================

-- Drop the old trigger function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This makes it run with elevated permissions, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into profiles (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    organization_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'foster_carer'::user_role
    ),
    -- Only set organization_id if explicitly provided
    CASE 
      WHEN NEW.raw_user_meta_data->>'organization_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'organization_id')::UUID
      ELSE NULL
    END
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile when a new user signs up. Uses SECURITY DEFINER to bypass RLS. Organization ID is optional and can be assigned later by an admin.';
