-- Fix RLS policy that's causing "more than one row returned" error
-- The issue is that the RPC functions in WITH CHECK clause can cause issues
-- Let's simplify the policy to avoid subquery issues

DROP POLICY IF EXISTS "Creators and committee can update societies" ON societies;

-- Simpler policy that checks creator_email directly
CREATE POLICY "Creators and committee can update societies"
ON societies
FOR UPDATE
USING (
  -- User must be a committee member to update
  EXISTS (
    SELECT 1 FROM society_members
    WHERE society_members.society_id = societies.id
    AND society_members.user_id = auth.uid()
    AND society_members.role = 'committee'
  )
)
WITH CHECK (
  -- Creators (based on creator_email matching user's email) can update everything except is_verified
  (creator_email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
   AND is_verified = (SELECT is_verified FROM societies WHERE id = societies.id))
  OR
  -- Committee members can only update name, slug, and logo_url (not creator_email or is_verified)
  (EXISTS (
    SELECT 1 FROM society_members
    WHERE society_members.society_id = societies.id
    AND society_members.user_id = auth.uid()
    AND society_members.role = 'committee'
  )
  AND creator_email = (SELECT creator_email FROM societies WHERE id = societies.id)
  AND is_verified = (SELECT is_verified FROM societies WHERE id = societies.id))
);