-- Fix Auth RLS Initialization Plan warnings by wrapping auth.uid() with SELECT
-- Fix Multiple Permissive Policies by consolidating duplicate policies

-- =============================================================================
-- EVENT_FAQS: Consolidate and optimize policies
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view visible FAQs" ON public.event_faqs;
DROP POLICY IF EXISTS "Committee members can manage FAQs" ON public.event_faqs;

-- Consolidated SELECT policy for event_faqs
CREATE POLICY "Users can view event FAQs"
ON public.event_faqs
FOR SELECT
USING (
  is_visible = true 
  OR EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_faqs.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- Separate policies for INSERT, UPDATE, DELETE (committee only)
CREATE POLICY "Committee members can manage FAQs"
ON public.event_faqs
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_faqs.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_faqs.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- =============================================================================
-- EVENT_FEEDBACK_CONFIG: Consolidate and optimize policies
-- =============================================================================

DROP POLICY IF EXISTS "Committee members can view feedback config" ON public.event_feedback_config;
DROP POLICY IF EXISTS "Committee members can manage feedback config" ON public.event_feedback_config;

-- Single consolidated policy for all operations
CREATE POLICY "Committee members can manage feedback config"
ON public.event_feedback_config
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_feedback_config.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_feedback_config.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- =============================================================================
-- EVENT_FEEDBACK_QUESTIONS: Consolidate and optimize policies
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view feedback questions for public forms" ON public.event_feedback_questions;
DROP POLICY IF EXISTS "Committee members can view feedback questions" ON public.event_feedback_questions;
DROP POLICY IF EXISTS "Committee members can manage feedback questions" ON public.event_feedback_questions;
DROP POLICY IF EXISTS "Society members can view feedback questions for their events" ON public.event_feedback_questions;

-- Consolidated SELECT policy
CREATE POLICY "Users can view feedback questions"
ON public.event_feedback_questions
FOR SELECT
USING (
  true  -- Public forms are always visible
  OR EXISTS (
    SELECT 1
    FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = event_feedback_questions.event_id 
      AND sm.user_id = (SELECT auth.uid())
  )
);

-- Committee management policy for INSERT, UPDATE, DELETE
CREATE POLICY "Committee members can manage feedback questions"
ON public.event_feedback_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_feedback_questions.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = event_feedback_questions.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- =============================================================================
-- FEEDBACK_RESPONSES: Consolidate and optimize policies
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can submit feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Anyone can submit post-event feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Committee can view feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Committee members can view all responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Users can view their own responses" ON public.feedback_responses;

-- Single INSERT policy
CREATE POLICY "Anyone can submit feedback responses"
ON public.feedback_responses
FOR INSERT
WITH CHECK (true);

-- Consolidated SELECT policy
CREATE POLICY "Users can view feedback responses"
ON public.feedback_responses
FOR SELECT
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = feedback_responses.event_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- =============================================================================
-- FEEDBACK_ANSWERS: Consolidate and optimize policies
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can insert feedback answers" ON public.feedback_answers;
DROP POLICY IF EXISTS "Anyone can submit feedback answers" ON public.feedback_answers;
DROP POLICY IF EXISTS "Committee can view feedback answers" ON public.feedback_answers;
DROP POLICY IF EXISTS "Committee members can view all answers" ON public.feedback_answers;
DROP POLICY IF EXISTS "Users can view their own answers" ON public.feedback_answers;

-- Single INSERT policy
CREATE POLICY "Anyone can submit feedback answers"
ON public.feedback_answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM feedback_responses fr
    WHERE fr.id = feedback_answers.response_id
  )
);

-- Consolidated SELECT policy
CREATE POLICY "Users can view feedback answers"
ON public.feedback_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM feedback_responses fr
    WHERE fr.id = feedback_answers.response_id 
      AND fr.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM feedback_responses fr
    JOIN events e ON e.id = fr.event_id
    WHERE fr.id = feedback_answers.response_id 
      AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- =============================================================================
-- PLATFORM_FEEDBACK: Optimize auth.uid() call
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view platform feedback" ON public.platform_feedback;

CREATE POLICY "Admins can view platform feedback"
ON public.platform_feedback
FOR SELECT
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- =============================================================================
-- USER_ROLES: Consolidate duplicate SELECT policies
-- =============================================================================

DROP POLICY IF EXISTS "Optimized SELECT policy for user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Optimized admin management for user_roles" ON public.user_roles;

-- Single SELECT policy
CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role) 
  OR user_id = (SELECT auth.uid())
);

-- Admin management for INSERT, UPDATE, DELETE
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));