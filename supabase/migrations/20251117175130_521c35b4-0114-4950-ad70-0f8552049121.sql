-- Add feedback request tracking to code_acceptances
ALTER TABLE code_acceptances 
ADD COLUMN feedback_request_sent_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN code_acceptances.feedback_request_sent_at IS 'Timestamp when feedback request email was sent to this attendee';

-- Create index for querying unsent feedback requests
CREATE INDEX idx_code_acceptances_feedback_sent 
ON code_acceptances(event_id, feedback_request_sent_at) 
WHERE feedback_request_sent_at IS NULL;