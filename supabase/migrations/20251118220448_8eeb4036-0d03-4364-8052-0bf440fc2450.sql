-- Add submitter_email column to feedback_responses table
ALTER TABLE feedback_responses
ADD COLUMN submitter_email text;

-- Add comment explaining the column
COMMENT ON COLUMN feedback_responses.submitter_email IS 'Email of the user who submitted feedback (null if anonymous or not provided)';