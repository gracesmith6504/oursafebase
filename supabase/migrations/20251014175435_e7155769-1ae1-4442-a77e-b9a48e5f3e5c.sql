-- Create security definer function to check if user is a society member
CREATE OR REPLACE FUNCTION public.is_society_member(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.society_members
    WHERE user_id = _user_id
      AND society_id = _society_id
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view their society members" ON society_members;

-- Create new policy using the security definer function
CREATE POLICY "Members can view their society members"
ON society_members
FOR SELECT
USING (
  -- Users can see all members of societies they belong to
  public.is_society_member(auth.uid(), society_id)
  OR
  -- Users can always see their own memberships
  user_id = auth.uid()
);