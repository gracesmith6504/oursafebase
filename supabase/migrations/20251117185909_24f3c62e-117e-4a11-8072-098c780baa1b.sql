-- Allow society members (attendees) to view feedback questions for their events
CREATE POLICY "Society members can view feedback questions for their events"
ON event_feedback_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = event_feedback_questions.event_id
      AND sm.user_id = auth.uid()
  )
);