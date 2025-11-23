-- Add support for multiple choice questions in event feedback

-- Add columns for multiple choice options and settings
ALTER TABLE event_feedback_questions 
ADD COLUMN options jsonb DEFAULT NULL,
ADD COLUMN allow_multiple_answers boolean DEFAULT false;

COMMENT ON COLUMN event_feedback_questions.options IS 
  'Array of options for multiple choice questions, e.g., [{"id": "1", "text": "Option 1"}, {"id": "2", "text": "Option 2"}]';

COMMENT ON COLUMN event_feedback_questions.allow_multiple_answers IS 
  'For multiple choice questions: true = multi-select, false = single-select';

-- Update feedback_answers to support multiple choice responses
-- answer_text can store JSON array of selected option IDs for multiple choice
COMMENT ON COLUMN feedback_answers.answer_text IS 
  'Text answer for text questions, or JSON array of selected option IDs for multiple choice questions';