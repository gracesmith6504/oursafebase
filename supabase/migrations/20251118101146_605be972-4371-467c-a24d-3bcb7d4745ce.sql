-- Add reminder tracking column to code_acceptances table
ALTER TABLE code_acceptances 
ADD COLUMN feedback_reminder_sent_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN code_acceptances.feedback_reminder_sent_at IS 'Timestamp when feedback reminder email was sent';

-- Create index for efficient reminder tracking queries
CREATE INDEX idx_code_acceptances_reminder_tracking 
ON code_acceptances(event_id, feedback_request_sent_at, feedback_reminder_sent_at) 
WHERE feedback_reminder_sent_at IS NULL;