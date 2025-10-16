-- Phase 1: Update code_of_conduct table for event-level CoCs
ALTER TABLE code_of_conduct 
ADD COLUMN event_id uuid REFERENCES events(id) ON DELETE CASCADE,
ADD COLUMN content_type text DEFAULT 'markdown' CHECK (content_type IN ('text', 'markdown'));

-- Add constraint: must have either society_id OR event_id, not both
ALTER TABLE code_of_conduct
ADD CONSTRAINT check_coc_scope CHECK (
  (society_id IS NOT NULL AND event_id IS NULL) OR
  (society_id IS NULL AND event_id IS NOT NULL)
);

-- Phase 2: Update code_acceptances table for user tracking
ALTER TABLE code_acceptances
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN accepted_version integer;

-- Add unique constraint: one acceptance per user per CoC version
CREATE UNIQUE INDEX idx_user_coc_acceptance 
ON code_acceptances(user_id, code_of_conduct_id, accepted_version)
WHERE user_id IS NOT NULL;

-- Add index for querying acceptances by event
CREATE INDEX idx_code_acceptances_event 
ON code_acceptances(event_id);

-- Phase 3: Update RLS Policies for authenticated access only

-- Events: Remove public access, require society membership
DROP POLICY IF EXISTS "Anyone can view events" ON events;

CREATE POLICY "Society members can view events"
ON events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM society_members
    WHERE society_members.society_id = events.society_id
    AND society_members.user_id = auth.uid()
  )
);

-- Code of Conduct: Update for authenticated members only
DROP POLICY IF EXISTS "Anyone can view active code of conduct" ON code_of_conduct;

CREATE POLICY "Society members can view their CoC"
ON code_of_conduct FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    (society_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM society_members
      WHERE society_members.society_id = code_of_conduct.society_id
      AND society_members.user_id = auth.uid()
    ))
    OR (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = code_of_conduct.event_id
      AND sm.user_id = auth.uid()
    ))
  )
);

-- Code Acceptances: Update for authenticated users
DROP POLICY IF EXISTS "Anyone can accept code of conduct" ON code_acceptances;

CREATE POLICY "Authenticated users can accept CoC"
ON code_acceptances FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = code_acceptances.event_id
    AND sm.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can view own acceptances"
ON code_acceptances FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Reports: Require society membership
DROP POLICY IF EXISTS "Anyone can submit reports" ON reports;

CREATE POLICY "Society members can submit reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = reports.event_id
    AND sm.user_id = auth.uid()
  )
);

-- Event Feedback: Require society membership
DROP POLICY IF EXISTS "Anyone can submit feedback" ON event_feedback;

CREATE POLICY "Society members can submit feedback"
ON event_feedback FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = event_feedback.event_id
    AND sm.user_id = auth.uid()
  )
);

-- Safety Page Views: Require society membership
DROP POLICY IF EXISTS "Anyone can record page views" ON safety_page_views;

CREATE POLICY "Society members can record page views"
ON safety_page_views FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = safety_page_views.event_id
    AND sm.user_id = auth.uid()
  )
);