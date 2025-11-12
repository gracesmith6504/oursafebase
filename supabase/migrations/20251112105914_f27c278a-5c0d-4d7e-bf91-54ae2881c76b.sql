-- Create function to check if an email belongs to a committee member of a society
CREATE OR REPLACE FUNCTION public.is_committee_member_by_email(
  _email text,
  _society_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN society_members sm ON sm.user_id = u.id
    WHERE u.email = _email
      AND sm.society_id = _society_id
      AND sm.role = 'committee'
  )
$$;