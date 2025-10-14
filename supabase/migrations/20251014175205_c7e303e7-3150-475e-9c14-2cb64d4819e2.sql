-- Fix infinite recursion in society_members RLS policy
DROP POLICY IF EXISTS "Members can view their society members" ON society_members;

-- Allow users to view memberships where they are a member of the same society
CREATE POLICY "Members can view their society members"
ON society_members
FOR SELECT
USING (
  -- Users can see all members of societies they belong to
  society_id IN (
    SELECT sm.society_id
    FROM society_members sm
    WHERE sm.user_id = auth.uid()
  )
  OR
  -- Users can always see their own memberships
  user_id = auth.uid()
);