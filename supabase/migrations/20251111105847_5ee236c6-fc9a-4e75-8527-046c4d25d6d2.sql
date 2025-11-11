-- ================================================================
-- PERFORMANCE OPTIMIZATION: Fix RLS Auth Initialization Plans
-- ================================================================
-- 
-- Issue: All RLS policies call auth.uid() directly, causing it to be
-- re-evaluated for EVERY row. This creates O(n) complexity instead of O(1).
-- 
-- Solution: Wrap auth.uid() in subqueries: (select auth.uid())
-- This evaluates the function once per query instead of once per row.
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ================================================================

-- ================================================================
-- PROFILES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view society member profiles" ON public.profiles;

-- Combine two SELECT policies into one for better performance
CREATE POLICY "Users can view profiles" 
  ON public.profiles FOR SELECT 
  USING (
    (select auth.uid()) = id  -- Own profile
    OR 
    EXISTS (  -- Society member profiles
      SELECT 1
      FROM society_members sm1
      JOIN society_members sm2 ON sm1.society_id = sm2.society_id
      WHERE sm1.user_id = (select auth.uid()) 
        AND sm2.user_id = profiles.id
    )
  );

-- ================================================================
-- CODE_ACCEPTANCES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Authenticated users can accept CoC" ON public.code_acceptances;
CREATE POLICY "Authenticated users can accept CoC" 
  ON public.code_acceptances FOR INSERT 
  WITH CHECK (
    (EXISTS (
      SELECT 1
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = code_acceptances.event_id 
        AND sm.user_id = (select auth.uid())
    )) 
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Society members can view acceptances for their events" ON public.code_acceptances;
DROP POLICY IF EXISTS "Users can view own acceptances" ON public.code_acceptances;

-- Combine two SELECT policies into one
CREATE POLICY "Users can view code acceptances" 
  ON public.code_acceptances FOR SELECT 
  USING (
    user_id = (select auth.uid())  -- Own acceptances
    OR 
    EXISTS (  -- Society member event acceptances
      SELECT 1
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = code_acceptances.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

-- ================================================================
-- CODE_OF_CONDUCT TABLE
-- ================================================================

DROP POLICY IF EXISTS "Committee members can manage code of conduct" ON public.code_of_conduct;
DROP POLICY IF EXISTS "Society members can view their CoC" ON public.code_of_conduct;

-- Combine into single policy for better performance
CREATE POLICY "Users can access code of conduct" 
  ON public.code_of_conduct FOR ALL 
  USING (
    is_committee_member((select auth.uid()), COALESCE(society_id, (
      SELECT events.society_id 
      FROM events 
      WHERE events.id = code_of_conduct.event_id
    )))  -- Committee can do all operations
    OR 
    (  -- Society members can view active CoCs
      is_active = true 
      AND (
        (society_id IS NOT NULL AND EXISTS (
          SELECT 1 
          FROM society_members 
          WHERE society_members.society_id = code_of_conduct.society_id 
            AND society_members.user_id = (select auth.uid())
        ))
        OR 
        (event_id IS NOT NULL AND EXISTS (
          SELECT 1 
          FROM events e
          JOIN society_members sm ON sm.society_id = e.society_id
          WHERE e.id = code_of_conduct.event_id 
            AND sm.user_id = (select auth.uid())
        ))
      )
    )
  );

-- ================================================================
-- EMERGENCY_INFO TABLE
-- ================================================================

DROP POLICY IF EXISTS "Anyone can view emergency info" ON public.emergency_info;
DROP POLICY IF EXISTS "Committee members can manage emergency info" ON public.emergency_info;

-- Combine into single policy
CREATE POLICY "Users can access emergency info" 
  ON public.emergency_info FOR ALL 
  USING (
    true  -- Anyone can view
    OR 
    EXISTS (  -- Committee can manage
      SELECT 1 
      FROM events e 
      WHERE e.id = emergency_info.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

-- ================================================================
-- EVENT_CONTACTS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Anyone can view event contacts" ON public.event_contacts;
DROP POLICY IF EXISTS "Committee members can manage event contacts" ON public.event_contacts;

-- Combine into single policy
CREATE POLICY "Users can access event contacts" 
  ON public.event_contacts FOR ALL 
  USING (
    true  -- Anyone can view
    OR 
    EXISTS (  -- Committee can manage
      SELECT 1 
      FROM events e 
      WHERE e.id = event_contacts.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

-- ================================================================
-- EVENT_FEEDBACK TABLE
-- ================================================================

DROP POLICY IF EXISTS "Society members can submit feedback" ON public.event_feedback;
CREATE POLICY "Society members can submit feedback" 
  ON public.event_feedback FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = event_feedback.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Society members can view feedback for their events" ON public.event_feedback;
CREATE POLICY "Society members can view feedback for their events" 
  ON public.event_feedback FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = event_feedback.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

-- ================================================================
-- EVENT_NOTES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Committee members can view event notes" ON public.event_notes;
CREATE POLICY "Committee members can view event notes" 
  ON public.event_notes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM events e 
      WHERE e.id = event_notes.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

DROP POLICY IF EXISTS "Committee members can create event notes" ON public.event_notes;
CREATE POLICY "Committee members can create event notes" 
  ON public.event_notes FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM events e 
      WHERE e.id = event_notes.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

DROP POLICY IF EXISTS "Committee members can update event notes" ON public.event_notes;
CREATE POLICY "Committee members can update event notes" 
  ON public.event_notes FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 
      FROM events e 
      WHERE e.id = event_notes.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

DROP POLICY IF EXISTS "Committee members can delete own notes" ON public.event_notes;
CREATE POLICY "Committee members can delete own notes" 
  ON public.event_notes FOR DELETE 
  USING (
    user_id = (select auth.uid()) 
    AND EXISTS (
      SELECT 1 
      FROM events e 
      WHERE e.id = event_notes.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

-- ================================================================
-- EVENTS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Committee members can create events" ON public.events;
CREATE POLICY "Committee members can create events" 
  ON public.events FOR INSERT 
  WITH CHECK (
    is_committee_member((select auth.uid()), society_id)
  );

DROP POLICY IF EXISTS "Committee members can update events" ON public.events;
CREATE POLICY "Committee members can update events" 
  ON public.events FOR UPDATE 
  USING (
    is_committee_member((select auth.uid()), society_id)
  );

-- ================================================================
-- REPORTS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Society members can submit reports" ON public.reports;
CREATE POLICY "Society members can submit reports" 
  ON public.reports FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = reports.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Society members can view reports for their events" ON public.reports;
CREATE POLICY "Society members can view reports for their events" 
  ON public.reports FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = reports.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Committee members can update report status" ON public.reports;
CREATE POLICY "Committee members can update report status" 
  ON public.reports FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 
      FROM events e 
      WHERE e.id = reports.event_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

-- ================================================================
-- REPORT_BOOKMARKS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Committee members can bookmark reports in their society" ON public.report_bookmarks;
CREATE POLICY "Committee members can bookmark reports in their society" 
  ON public.report_bookmarks FOR INSERT 
  WITH CHECK (
    user_id = (select auth.uid()) 
    AND EXISTS (
      SELECT 1 
      FROM reports r
      JOIN events e ON e.id = r.event_id
      WHERE r.id = report_bookmarks.report_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

DROP POLICY IF EXISTS "Committee members can view bookmarks for their society reports" ON public.report_bookmarks;
CREATE POLICY "Committee members can view bookmarks for their society reports" 
  ON public.report_bookmarks FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM reports r
      JOIN events e ON e.id = r.event_id
      WHERE r.id = report_bookmarks.report_id 
        AND is_committee_member((select auth.uid()), e.society_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.report_bookmarks;
CREATE POLICY "Users can delete their own bookmarks" 
  ON public.report_bookmarks FOR DELETE 
  USING (user_id = (select auth.uid()));

-- ================================================================
-- SAFETY_PAGE_VIEWS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Society members can record page views" ON public.safety_page_views;
CREATE POLICY "Society members can record page views" 
  ON public.safety_page_views FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = safety_page_views.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Society members can view page analytics" ON public.safety_page_views;
CREATE POLICY "Society members can view page analytics" 
  ON public.safety_page_views FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = safety_page_views.event_id 
        AND sm.user_id = (select auth.uid())
    )
  );

-- ================================================================
-- SOCIETIES TABLE
-- ================================================================

DROP POLICY IF EXISTS "Committee members can update their society" ON public.societies;
CREATE POLICY "Committee members can update their society" 
  ON public.societies FOR UPDATE 
  USING (
    is_committee_member((select auth.uid()), id)
  );

-- ================================================================
-- SOCIETY_MEMBERS TABLE
-- ================================================================

DROP POLICY IF EXISTS "Members can view their society members" ON public.society_members;
CREATE POLICY "Members can view their society members" 
  ON public.society_members FOR SELECT 
  USING (
    is_society_member((select auth.uid()), society_id) 
    OR user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.society_members;
CREATE POLICY "Users can delete their own memberships" 
  ON public.society_members FOR DELETE 
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.society_members;
CREATE POLICY "Users can update own notification preferences" 
  ON public.society_members FOR UPDATE 
  USING ((select auth.uid()) = user_id) 
  WITH CHECK ((select auth.uid()) = user_id);