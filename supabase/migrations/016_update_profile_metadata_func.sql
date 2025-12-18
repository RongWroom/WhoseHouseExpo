-- ============================================
-- FUNCTION: update_own_profile_metadata
-- Description: Allows users to update their own profile metadata safely
-- bypassing RLS strictly for this column.
-- ============================================

CREATE OR REPLACE FUNCTION public.update_own_profile_metadata(p_metadata jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the user's own profile
  UPDATE public.profiles
  SET
    metadata = p_metadata,
    updated_at = NOW()
  WHERE id = auth.uid();

  -- Ensure a row was actually updated (optional check)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_own_profile_metadata(jsonb) TO authenticated;
