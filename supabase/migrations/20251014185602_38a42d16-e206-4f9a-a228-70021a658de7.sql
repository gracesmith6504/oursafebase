-- Add custom emergency info column to emergency_info table
ALTER TABLE emergency_info 
ADD COLUMN IF NOT EXISTS custom_emergency_info JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN emergency_info.custom_emergency_info IS 'Additional custom emergency information fields stored as JSON array';