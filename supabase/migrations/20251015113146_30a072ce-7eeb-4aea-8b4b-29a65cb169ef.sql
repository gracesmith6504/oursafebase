-- Allow users to delete their own society memberships
CREATE POLICY "Users can delete their own memberships"
ON public.society_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON POLICY "Users can delete their own memberships" ON public.society_members 
IS 'Allows authenticated users to remove themselves from societies they have joined';