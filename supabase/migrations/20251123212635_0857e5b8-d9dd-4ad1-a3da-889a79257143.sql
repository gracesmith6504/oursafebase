-- Allow anonymous users to insert feedback responses and answers
-- This enables public feedback form submissions

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Anyone can submit feedback answers" ON public.feedback_answers;

-- Enable RLS on both tables (if not already enabled)
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous users) to insert feedback responses
CREATE POLICY "Anyone can submit feedback responses"
ON public.feedback_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone (including anonymous users) to insert feedback answers
CREATE POLICY "Anyone can submit feedback answers"
ON public.feedback_answers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Committee members can view all feedback for their society's events
DROP POLICY IF EXISTS "Committee can view feedback responses" ON public.feedback_responses;
CREATE POLICY "Committee can view feedback responses"
ON public.feedback_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = feedback_responses.event_id
    AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- Committee members can view all feedback answers for their society's events
DROP POLICY IF EXISTS "Committee can view feedback answers" ON public.feedback_answers;
CREATE POLICY "Committee can view feedback answers"
ON public.feedback_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM feedback_responses fr
    JOIN events e ON e.id = fr.event_id
    WHERE fr.id = feedback_answers.response_id
    AND is_committee_member(auth.uid(), e.society_id)
  )
);