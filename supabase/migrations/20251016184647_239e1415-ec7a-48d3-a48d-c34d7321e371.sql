-- Create a function to validate invite codes without requiring committee membership
CREATE OR REPLACE FUNCTION public.validate_invite_code(invite_code text)
RETURNS TABLE(
  society_id uuid,
  society_name text,
  society_slug text,
  role_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    slug,
    CASE 
      WHEN committee_invite_code = invite_code THEN 'committee'
      WHEN attendee_invite_code = invite_code THEN 'attendee'
      ELSE NULL
    END as role_type
  FROM societies
  WHERE committee_invite_code = invite_code 
     OR attendee_invite_code = invite_code
  LIMIT 1;
$$;