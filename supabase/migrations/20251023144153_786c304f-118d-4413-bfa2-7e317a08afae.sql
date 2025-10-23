-- Allow users to update their own email notification preferences
CREATE POLICY "Users can update own notification preferences"
  ON public.society_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);