-- Drop the old restrictive policy that only allows society members to view events
DROP POLICY IF EXISTS "Society members can view events" ON events;

-- Allow anyone (even non-members) to view event details for safety pages
-- This is necessary for sharing event safety pages publicly via QR codes and links
CREATE POLICY "Anyone can view events for safety pages"
ON events FOR SELECT
USING (true);