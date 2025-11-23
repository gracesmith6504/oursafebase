-- Drop the old check constraint
ALTER TABLE event_feedback_questions 
DROP CONSTRAINT IF EXISTS event_feedback_questions_question_type_check;

-- Add the updated check constraint with all three types
ALTER TABLE event_feedback_questions 
ADD CONSTRAINT event_feedback_questions_question_type_check 
CHECK (question_type IN ('text', 'rating', 'multiple_choice'));