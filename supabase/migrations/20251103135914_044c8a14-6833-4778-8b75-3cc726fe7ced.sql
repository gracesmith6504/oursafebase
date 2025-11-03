-- Fix event_contacts.role constraint to allow optional roles
-- Drop the overly restrictive constraint
ALTER TABLE event_contacts 
  DROP CONSTRAINT IF EXISTS event_contacts_role_length;

-- Add new constraint that allows empty/null roles (matching UI behavior)
ALTER TABLE event_contacts 
  ADD CONSTRAINT event_contacts_role_length 
  CHECK (role IS NULL OR char_length(role) <= 100);

-- Clean up existing empty strings to NULL for consistency
UPDATE event_contacts 
SET role = NULL 
WHERE role IS NOT NULL AND char_length(TRIM(role)) = 0;