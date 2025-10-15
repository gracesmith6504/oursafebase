-- Add contact_avatar_url column to event_contacts for avatar snapshots
ALTER TABLE event_contacts 
ADD COLUMN IF NOT EXISTS contact_avatar_url text;

-- Backfill existing contacts with current avatar URLs where user_id exists
UPDATE event_contacts ec
SET contact_avatar_url = p.avatar_url
FROM profiles p
WHERE ec.user_id = p.id 
  AND ec.contact_avatar_url IS NULL
  AND p.avatar_url IS NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_contacts_user_id ON event_contacts(user_id) WHERE user_id IS NOT NULL;