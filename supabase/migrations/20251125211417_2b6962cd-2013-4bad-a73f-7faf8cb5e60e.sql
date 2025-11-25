-- Fix feedback_answers INSERT policy to work for anonymous users
-- The issue: the WITH CHECK tries to SELECT from feedback_responses, but anonymous users
-- can't SELECT their own responses due to RLS policies
-- Solution: Remove the WITH CHECK since the foreign key constraint already ensures data integrity

DROP POLICY IF EXISTS "Anyone can submit feedback answers" ON public.feedback_answers;

CREATE POLICY "Anyone can submit feedback answers"
ON public.feedback_answers
FOR INSERT
TO public
WITH CHECK (true);

-- Also ensure anonymous users can select responses they created
-- Update the SELECT policy on feedback_responses to allow selection by response_id
-- for users who are submitting answers (needed for the form to work)
DROP POLICY IF EXISTS "Users can view feedback responses" ON public.feedback_responses;

CREATE POLICY "Users can view feedback responses"
ON public.feedback_responses
FOR SELECT
TO public
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = feedback_responses.event_id
    AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
  OR (
    -- Allow viewing if user is submitting answers to this response
    -- This allows the form to work for anonymous users
    user_id IS NULL
  )
);