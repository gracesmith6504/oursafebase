-- Fix feedback_answers SELECT policy to include anonymous responses for committee members
-- Currently committee can see feedback_responses but not the corresponding feedback_answers for anonymous submissions

DROP POLICY IF EXISTS "Users can view feedback answers" ON public.feedback_answers;

CREATE POLICY "Users can view feedback answers"
ON public.feedback_answers
FOR SELECT
TO public
USING (
  -- Users can see their own answers
  EXISTS (
    SELECT 1 FROM feedback_responses fr
    WHERE fr.id = feedback_answers.response_id
    AND fr.user_id = (SELECT auth.uid())
  )
  OR
  -- Committee members can see all answers for their society's events (including anonymous)
  EXISTS (
    SELECT 1
    FROM feedback_responses fr
    JOIN events e ON e.id = fr.event_id
    WHERE fr.id = feedback_answers.response_id
    AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);