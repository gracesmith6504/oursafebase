-- Performance Optimization Migration (Complete)
-- Fix RLS policy re-evaluation issues and combine multiple permissive policies

-- ============================================
-- PART 1: SOCIETIES TABLE - Drop ALL existing policies
-- ============================================

DROP POLICY IF EXISTS "Admins can verify societies" ON public.societies;
DROP POLICY IF EXISTS "Committee can update non-owner fields" ON public.societies;
DROP POLICY IF EXISTS "Creators can update their society" ON public.societies;
DROP POLICY IF EXISTS "Optimized UPDATE policy for societies" ON public.societies;

-- Combined optimized UPDATE policy
CREATE POLICY "Optimized UPDATE policy for societies" ON public.societies
FOR UPDATE
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR is_committee_member((select auth.uid()), id)
  OR is_society_creator((select auth.uid()), id)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR (
    is_committee_member((select auth.uid()), id)
    AND creator_email = (SELECT s.creator_email FROM societies s WHERE s.id = societies.id)
    AND is_verified = (SELECT s.is_verified FROM societies s WHERE s.id = societies.id)
  )
  OR (
    is_society_creator((select auth.uid()), id)
    AND is_verified = (SELECT s.is_verified FROM societies s WHERE s.id = societies.id)
  )
);

-- ============================================
-- PART 2: SOCIETY_MEMBERS TABLE
-- ============================================

DROP POLICY IF EXISTS "Creators can remove members or users can leave" ON public.society_members;
DROP POLICY IF EXISTS "Optimized DELETE policy for society_members" ON public.society_members;

CREATE POLICY "Optimized DELETE policy for society_members" ON public.society_members
FOR DELETE
USING (
  is_society_creator((select auth.uid()), society_id) 
  OR ((select auth.uid()) = user_id)
);

-- ============================================
-- PART 3: EVENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Committee members can delete events" ON public.events;
DROP POLICY IF EXISTS "Optimized DELETE policy for events" ON public.events;

CREATE POLICY "Optimized DELETE policy for events" ON public.events
FOR DELETE
USING (is_committee_member((select auth.uid()), society_id));

-- ============================================
-- PART 4: USER_ROLES TABLE
-- ============================================

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Optimized SELECT policy for user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Optimized admin management for user_roles" ON public.user_roles;

CREATE POLICY "Optimized SELECT policy for user_roles" ON public.user_roles
FOR SELECT
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR ((select auth.uid()) = user_id)
);

CREATE POLICY "Optimized admin management for user_roles" ON public.user_roles
FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- ============================================
-- PART 5: USER_CONSENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can insert own consent" ON public.user_consents;
DROP POLICY IF EXISTS "Users can view own consent" ON public.user_consents;
DROP POLICY IF EXISTS "Optimized INSERT policy for user_consents" ON public.user_consents;
DROP POLICY IF EXISTS "Optimized SELECT policy for user_consents" ON public.user_consents;

CREATE POLICY "Optimized INSERT policy for user_consents" ON public.user_consents
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Optimized SELECT policy for user_consents" ON public.user_consents
FOR SELECT
USING ((select auth.uid()) = user_id);

-- ============================================
-- PART 6: USER_ACTIVITY_LOGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Society members can view activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Optimized SELECT policy for user_activity_logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Optimized INSERT policy for user_activity_logs" ON public.user_activity_logs;

CREATE POLICY "Optimized SELECT policy for user_activity_logs" ON public.user_activity_logs
FOR SELECT
USING (
  society_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM society_members 
    WHERE society_members.society_id = user_activity_logs.society_id 
    AND society_members.user_id = (select auth.uid())
  )
);

CREATE POLICY "Optimized INSERT policy for user_activity_logs" ON public.user_activity_logs
FOR INSERT
WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- PART 7: REPORT_STATUS_HISTORY TABLE
-- ============================================

DROP POLICY IF EXISTS "Committee members can insert status history" ON public.report_status_history;
DROP POLICY IF EXISTS "Committee members can view status history" ON public.report_status_history;
DROP POLICY IF EXISTS "Optimized INSERT policy for report_status_history" ON public.report_status_history;
DROP POLICY IF EXISTS "Optimized SELECT policy for report_status_history" ON public.report_status_history;

CREATE POLICY "Optimized INSERT policy for report_status_history" ON public.report_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN events e ON e.id = r.event_id
    WHERE r.id = report_status_history.report_id
    AND is_committee_member((select auth.uid()), e.society_id)
  )
);

CREATE POLICY "Optimized SELECT policy for report_status_history" ON public.report_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports r
    JOIN events e ON e.id = r.event_id
    WHERE r.id = report_status_history.report_id
    AND is_committee_member((select auth.uid()), e.society_id)
  )
);

-- ============================================
-- PART 8: WEEKLY_METRICS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can insert weekly metrics" ON public.weekly_metrics;
DROP POLICY IF EXISTS "Optimized INSERT policy for weekly_metrics" ON public.weekly_metrics;

CREATE POLICY "Optimized INSERT policy for weekly_metrics" ON public.weekly_metrics
FOR INSERT
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- ============================================
-- PART 9: INVITE_CODE_USAGE TABLE
-- ============================================

DROP POLICY IF EXISTS "Committee members can view invite usage" ON public.invite_code_usage;
DROP POLICY IF EXISTS "Optimized SELECT policy for invite_code_usage" ON public.invite_code_usage;

CREATE POLICY "Optimized SELECT policy for invite_code_usage" ON public.invite_code_usage
FOR SELECT
USING (is_committee_member((select auth.uid()), society_id));

-- ============================================
-- PART 10: ADD PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_code_of_conduct_event_active 
ON public.code_of_conduct(event_id, is_active) 
WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_code_of_conduct_society_active 
ON public.code_of_conduct(society_id, is_active) 
WHERE society_id IS NOT NULL AND event_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_contacts_event_order 
ON public.event_contacts(event_id, display_order);

CREATE INDEX IF NOT EXISTS idx_emergency_info_event 
ON public.emergency_info(event_id);

CREATE INDEX IF NOT EXISTS idx_code_acceptances_user_event 
ON public.code_acceptances(user_id, event_id);

CREATE INDEX IF NOT EXISTS idx_code_acceptances_event 
ON public.code_acceptances(event_id);

CREATE INDEX IF NOT EXISTS idx_reports_event_status 
ON public.reports(event_id, status);

CREATE INDEX IF NOT EXISTS idx_society_members_society_role 
ON public.society_members(society_id, role);

-- ============================================
-- PART 11: BACKFILL LAST_LOGIN_AT
-- ============================================

UPDATE public.profiles 
SET last_login_at = created_at 
WHERE last_login_at IS NULL;