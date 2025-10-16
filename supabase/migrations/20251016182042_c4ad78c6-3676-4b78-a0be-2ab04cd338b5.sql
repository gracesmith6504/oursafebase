-- Create role enum
CREATE TYPE public.society_member_role AS ENUM ('committee', 'attendee');

-- Add role column to society_members
ALTER TABLE society_members 
ADD COLUMN role society_member_role NOT NULL DEFAULT 'attendee';

-- Update existing members to be committee (since they joined via old flow)
UPDATE society_members SET role = 'committee';

-- Add committee_invite_code column
ALTER TABLE societies 
ADD COLUMN committee_invite_code text UNIQUE NOT NULL DEFAULT generate_invite_code();

-- Rename existing invite_code to attendee_invite_code for clarity
ALTER TABLE societies 
RENAME COLUMN invite_code TO attendee_invite_code;

-- Create security definer function to check if user is committee
CREATE OR REPLACE FUNCTION public.is_committee_member(_user_id uuid, _society_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.society_members
    WHERE user_id = _user_id
      AND society_id = _society_id
      AND role = 'committee'
  )
$$;

-- Update RLS policies for committee-only actions

-- Events: Only committee can create/update
DROP POLICY IF EXISTS "Society members can create events" ON events;
CREATE POLICY "Committee members can create events"
ON events FOR INSERT
TO authenticated
WITH CHECK (is_committee_member(auth.uid(), society_id));

DROP POLICY IF EXISTS "Society members can update their events" ON events;
CREATE POLICY "Committee members can update events"
ON events FOR UPDATE
TO authenticated
USING (is_committee_member(auth.uid(), society_id));

-- Reports: Only committee can update status
DROP POLICY IF EXISTS "Society members can update report status" ON reports;
CREATE POLICY "Committee members can update report status"
ON reports FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = reports.event_id
  AND is_committee_member(auth.uid(), e.society_id)
));

-- Code of Conduct: Only committee can manage
DROP POLICY IF EXISTS "Society members can manage code of conduct" ON code_of_conduct;
CREATE POLICY "Committee members can manage code of conduct"
ON code_of_conduct FOR ALL
TO authenticated
USING (is_committee_member(auth.uid(), COALESCE(society_id, (
  SELECT society_id FROM events WHERE id = code_of_conduct.event_id
))));

-- Emergency Info: Only committee can manage
DROP POLICY IF EXISTS "Society members can manage emergency info" ON emergency_info;
CREATE POLICY "Committee members can manage emergency info"
ON emergency_info FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = emergency_info.event_id
  AND is_committee_member(auth.uid(), e.society_id)
));

-- Event Contacts: Only committee can manage
DROP POLICY IF EXISTS "Society members can manage event contacts" ON event_contacts;
CREATE POLICY "Committee members can manage event contacts"
ON event_contacts FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = event_contacts.event_id
  AND is_committee_member(auth.uid(), e.society_id)
));

-- Societies: Only committee can update
DROP POLICY IF EXISTS "Society members can update their society" ON societies;
CREATE POLICY "Committee members can update their society"
ON societies FOR UPDATE
TO authenticated
USING (is_committee_member(auth.uid(), id));