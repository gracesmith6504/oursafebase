-- Final comprehensive data cleanup and validation

-- Fix event_contacts with empty roles
UPDATE event_contacts
SET role = 'Contact'
WHERE role IS NULL OR char_length(TRIM(role)) = 0;

-- Clean reports
UPDATE reports 
SET reporter_name = NULL 
WHERE reporter_name IS NOT NULL AND char_length(TRIM(reporter_name)) = 0;

-- Clean event_feedback contact names
UPDATE event_feedback
SET contact_name = NULL 
WHERE contact_name IS NOT NULL AND char_length(TRIM(contact_name)) = 0;

-- Clean event_feedback improvements
UPDATE event_feedback
SET improvements = NULL 
WHERE improvements IS NOT NULL AND char_length(TRIM(improvements)) = 0;

-- Clean profiles
UPDATE profiles
SET display_name = NULL
WHERE display_name IS NOT NULL AND char_length(TRIM(display_name)) = 0;

-- Clean event_contacts external names
UPDATE event_contacts
SET external_name = NULL
WHERE external_name IS NOT NULL AND char_length(TRIM(external_name)) = 0;

-- Clean events descriptions
UPDATE events
SET description = NULL 
WHERE description IS NOT NULL AND char_length(TRIM(description)) = 0;

-- Clean events locations
UPDATE events
SET location = NULL 
WHERE location IS NOT NULL AND char_length(TRIM(location)) = 0;

-- Clean code_of_conduct content
UPDATE code_of_conduct
SET content = NULL 
WHERE content IS NOT NULL AND char_length(TRIM(content)) = 0;

-- Clean code_of_conduct names
UPDATE code_of_conduct
SET name = NULL 
WHERE name IS NOT NULL AND char_length(TRIM(name)) = 0;

-- Add constraints to prevent invalid data

-- Reports
ALTER TABLE reports ADD CONSTRAINT reports_description_length 
  CHECK (char_length(description) > 0 AND char_length(description) <= 2000);

ALTER TABLE reports ADD CONSTRAINT reports_reporter_name_length 
  CHECK (reporter_name IS NULL OR (char_length(reporter_name) > 0 AND char_length(reporter_name) <= 100));

ALTER TABLE reports ADD CONSTRAINT reports_reporter_email_format
  CHECK (reporter_email IS NULL OR reporter_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Event feedback
ALTER TABLE event_feedback ADD CONSTRAINT feedback_improvements_length 
  CHECK (improvements IS NULL OR (char_length(improvements) > 0 AND char_length(improvements) <= 2000));

ALTER TABLE event_feedback ADD CONSTRAINT feedback_contact_name_length
  CHECK (contact_name IS NULL OR (char_length(contact_name) > 0 AND char_length(contact_name) <= 100));

ALTER TABLE event_feedback ADD CONSTRAINT feedback_contact_email_format
  CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Event notes
ALTER TABLE event_notes ADD CONSTRAINT notes_content_length 
  CHECK (char_length(content) > 0 AND char_length(content) <= 5000);

ALTER TABLE event_notes ADD CONSTRAINT notes_tags_count 
  CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20);

-- Events
ALTER TABLE events ADD CONSTRAINT events_title_length 
  CHECK (char_length(title) > 0 AND char_length(title) <= 200);

ALTER TABLE events ADD CONSTRAINT events_description_length 
  CHECK (description IS NULL OR (char_length(description) > 0 AND char_length(description) <= 5000));

ALTER TABLE events ADD CONSTRAINT events_location_length
  CHECK (location IS NULL OR (char_length(location) > 0 AND char_length(location) <= 300));

-- Profiles
ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_length 
  CHECK (display_name IS NULL OR (char_length(display_name) > 0 AND char_length(display_name) <= 100));

-- Societies
ALTER TABLE societies ADD CONSTRAINT societies_name_length 
  CHECK (char_length(name) > 0 AND char_length(name) <= 150);

-- Event contacts
ALTER TABLE event_contacts ADD CONSTRAINT event_contacts_external_name_length
  CHECK (external_name IS NULL OR (char_length(external_name) > 0 AND char_length(external_name) <= 100));

ALTER TABLE event_contacts ADD CONSTRAINT event_contacts_role_length
  CHECK (char_length(role) > 0 AND char_length(role) <= 100);

-- Code of conduct
ALTER TABLE code_of_conduct ADD CONSTRAINT code_of_conduct_content_length
  CHECK (content IS NULL OR (char_length(content) > 0 AND char_length(content) <= 50000));

ALTER TABLE code_of_conduct ADD CONSTRAINT code_of_conduct_name_length
  CHECK (name IS NULL OR (char_length(name) > 0 AND char_length(name) <= 150));