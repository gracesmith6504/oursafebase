-- Add placeholder text support for feedback questions
ALTER TABLE event_feedback_questions 
ADD COLUMN placeholder_text text DEFAULT NULL;

COMMENT ON COLUMN event_feedback_questions.placeholder_text IS 
  'Optional placeholder text to guide user responses (e.g., "Tell us what you enjoyed most...")';