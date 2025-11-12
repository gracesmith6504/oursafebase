-- Phase 1: Data Foundation - Critical tracking tables

-- 1. User Activity Logs (track all user actions for engagement analytics)
CREATE TABLE user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'login', 'view_event', 'submit_report', 'update_report', 'view_dashboard', 'create_event', 'accept_coc', 'submit_feedback'
  society_id uuid REFERENCES societies(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb, -- Store additional context like device type, location, etc.
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_user_activity_society ON user_activity_logs(society_id, created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity_logs(activity_type, created_at DESC);
CREATE INDEX idx_user_activity_date ON user_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Society members can view activity in their society
CREATE POLICY "Society members can view activity logs"
ON user_activity_logs FOR SELECT
USING (
  society_id IS NULL OR
  EXISTS (
    SELECT 1 FROM society_members
    WHERE society_members.society_id = user_activity_logs.society_id
    AND society_members.user_id = auth.uid()
  )
);

-- Users can log their own activity
CREATE POLICY "Users can insert own activity"
ON user_activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 2. Report Status History (track status changes for response time KPI)
CREATE TABLE report_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamp with time zone DEFAULT now(),
  notes text
);

CREATE INDEX idx_report_status_history_report ON report_status_history(report_id, changed_at DESC);
CREATE INDEX idx_report_status_history_date ON report_status_history(changed_at DESC);

-- Enable RLS
ALTER TABLE report_status_history ENABLE ROW LEVEL SECURITY;

-- Committee members can view status history
CREATE POLICY "Committee members can view status history"
ON report_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN events e ON e.id = r.event_id
    WHERE r.id = report_status_history.report_id
    AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- Committee members can insert status history
CREATE POLICY "Committee members can insert status history"
ON report_status_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN events e ON e.id = r.event_id
    WHERE r.id = report_status_history.report_id
    AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- 3. Weekly Metrics Snapshots (aggregate metrics for trend analysis)
CREATE TABLE weekly_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  total_users int DEFAULT 0,
  active_users int DEFAULT 0, -- logged in during week
  new_users int DEFAULT 0,
  total_societies int DEFAULT 0,
  active_societies int DEFAULT 0, -- created event or viewed reports
  new_societies int DEFAULT 0,
  total_events int DEFAULT 0,
  new_events int DEFAULT 0,
  total_reports int DEFAULT 0,
  new_reports int DEFAULT 0,
  resolved_reports int DEFAULT 0,
  total_feedback int DEFAULT 0,
  new_feedback int DEFAULT 0,
  avg_safety_score numeric(3,2),
  created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX idx_weekly_metrics_week ON weekly_metrics(week_start);

-- Enable RLS
ALTER TABLE weekly_metrics ENABLE ROW LEVEL SECURITY;

-- Anyone can view weekly metrics (for public impact page)
CREATE POLICY "Anyone can view weekly metrics"
ON weekly_metrics FOR SELECT
USING (true);

-- Only admins can insert metrics (will be done via scheduled job)
CREATE POLICY "Admins can insert weekly metrics"
ON weekly_metrics FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Invite Code Usage (track viral growth)
CREATE TABLE invite_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code text NOT NULL,
  society_id uuid REFERENCES societies(id) ON DELETE CASCADE NOT NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role_type text NOT NULL, -- 'committee' or 'attendee'
  used_at timestamp with time zone DEFAULT now(),
  referrer_url text,
  ip_address inet
);

CREATE INDEX idx_invite_code_society ON invite_code_usage(society_id, used_at DESC);
CREATE INDEX idx_invite_code_user ON invite_code_usage(used_by);

-- Enable RLS
ALTER TABLE invite_code_usage ENABLE ROW LEVEL SECURITY;

-- Committee members can view invite code usage
CREATE POLICY "Committee members can view invite usage"
ON invite_code_usage FOR SELECT
USING (is_committee_member(auth.uid(), society_id));

-- Anyone can insert invite code usage
CREATE POLICY "Anyone can insert invite usage"
ON invite_code_usage FOR INSERT
WITH CHECK (true);

-- 5. Add columns to existing tables

-- Add response time tracking to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS response_time_minutes integer;

-- Add activation tracking to societies
ALTER TABLE societies ADD COLUMN IF NOT EXISTS activation_date timestamp with time zone;
ALTER TABLE societies ADD COLUMN IF NOT EXISTS university_name text;

-- Add last login tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- 6. Create trigger to automatically track report status changes
CREATE OR REPLACE FUNCTION track_report_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert status history record
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO report_status_history (report_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    
    -- Calculate first response time
    IF OLD.status = 'new' AND NEW.status != 'new' AND NEW.first_response_at IS NULL THEN
      NEW.first_response_at = now();
      NEW.response_time_minutes = EXTRACT(EPOCH FROM (now() - NEW.submitted_at)) / 60;
    END IF;
    
    -- Update resolved_at timestamp
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
      NEW.resolved_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_report_status_change_trigger
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION track_report_status_change();

-- 7. Create function to calculate society activation date
CREATE OR REPLACE FUNCTION update_society_activation_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set activation date when first event is created
  UPDATE societies
  SET activation_date = now()
  WHERE id = NEW.society_id
  AND activation_date IS NULL;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_society_activation_trigger
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION update_society_activation_date();

-- 8. Initialize activation_date for existing societies with events
UPDATE societies s
SET activation_date = (
  SELECT MIN(e.created_at)
  FROM events e
  WHERE e.society_id = s.id
)
WHERE activation_date IS NULL
AND EXISTS (
  SELECT 1 FROM events e WHERE e.society_id = s.id
);