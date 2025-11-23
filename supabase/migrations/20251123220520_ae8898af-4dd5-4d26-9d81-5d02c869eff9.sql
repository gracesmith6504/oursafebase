-- Drop the existing restrictive policy on societies
DROP POLICY IF EXISTS "Anyone can view basic society info" ON societies;

-- Create new permissive policy allowing public (anon + authenticated) to read societies
CREATE POLICY "Anyone can view basic society info"
ON societies
FOR SELECT
TO public
USING (true);