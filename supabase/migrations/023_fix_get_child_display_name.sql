CREATE OR REPLACE FUNCTION public.get_child_display_name(p_case_id uuid)
RETURNS text AS $$
DECLARE
  v_case_number text;
BEGIN
  SELECT case_number INTO v_case_number
  FROM public.cases
  WHERE id = p_case_id;

  RETURN COALESCE(v_case_number, 'Case-' || UPPER(SUBSTRING(p_case_id::text FROM 1 FOR 8)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_child_display_name(uuid) TO authenticated, anon;
