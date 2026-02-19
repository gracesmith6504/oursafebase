
-- Migration 1: Fix emergency_info RLS
DROP POLICY IF EXISTS "Users can access emergency info" ON public.emergency_info;

CREATE POLICY "Society members can view emergency info"
  ON public.emergency_info
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = emergency_info.event_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Committee members can manage emergency info"
  ON public.emergency_info
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = emergency_info.event_id
        AND is_committee_member((SELECT auth.uid()), e.society_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = emergency_info.event_id
        AND is_committee_member((SELECT auth.uid()), e.society_id)
    )
  );

-- Migration 2: Fix event_contacts RLS
DROP POLICY IF EXISTS "Users can access event contacts" ON public.event_contacts;

CREATE POLICY "Society members can view event contacts"
  ON public.event_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = event_contacts.event_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Committee members can manage event contacts"
  ON public.event_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_contacts.event_id
        AND is_committee_member((SELECT auth.uid()), e.society_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_contacts.event_id
        AND is_committee_member((SELECT auth.uid()), e.society_id)
    )
  );

-- Migration 3: Fix event_feedback_questions SELECT RLS
DROP POLICY IF EXISTS "Users can view feedback questions" ON public.event_feedback_questions;

CREATE POLICY "Society members can view feedback questions"
  ON public.event_feedback_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = event_feedback_questions.event_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );
