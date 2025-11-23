-- Phase 1: Add optional_name field to feedback_responses
ALTER TABLE feedback_responses 
ADD COLUMN IF NOT EXISTS optional_name TEXT;

COMMENT ON COLUMN feedback_responses.optional_name IS 
  'Optional name provided by anonymous submitter (not linked to auth)';

-- Phase 2A: Update feedback_responses INSERT policy to allow anonymous submissions
DROP POLICY IF EXISTS "Society members can submit feedback responses" ON feedback_responses;

CREATE POLICY "Anyone can submit post-event feedback responses"
  ON feedback_responses
  FOR INSERT
  WITH CHECK (true);

-- Phase 2B: Update feedback_answers INSERT policy to allow anonymous submissions
DROP POLICY IF EXISTS "Users can insert their own answers" ON feedback_answers;

CREATE POLICY "Anyone can insert feedback answers"
  ON feedback_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM feedback_responses fr
      WHERE fr.id = feedback_answers.response_id
    )
  );

-- Phase 2C: Add policy to allow anyone to view feedback questions
CREATE POLICY "Anyone can view feedback questions for public forms"
  ON event_feedback_questions
  FOR SELECT
  USING (true);