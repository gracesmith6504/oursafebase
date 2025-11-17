-- Create event_feedback_config table
CREATE TABLE IF NOT EXISTS public.event_feedback_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_send_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_send_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id)
);

-- Create event_feedback_questions table
CREATE TABLE IF NOT EXISTS public.event_feedback_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('text', 'rating')),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on event_feedback_config
ALTER TABLE public.event_feedback_config ENABLE ROW LEVEL SECURITY;

-- Create policies for event_feedback_config
CREATE POLICY "Committee members can view feedback config"
  ON public.event_feedback_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_feedback_config.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

CREATE POLICY "Committee members can manage feedback config"
  ON public.event_feedback_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_feedback_config.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_feedback_config.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

-- Enable RLS on event_feedback_questions
ALTER TABLE public.event_feedback_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for event_feedback_questions
CREATE POLICY "Committee members can view feedback questions"
  ON public.event_feedback_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_feedback_questions.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

CREATE POLICY "Committee members can manage feedback questions"
  ON public.event_feedback_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_feedback_questions.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_feedback_questions.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_event_feedback_config_event_id ON public.event_feedback_config(event_id);
CREATE INDEX idx_event_feedback_questions_event_id ON public.event_feedback_questions(event_id);
CREATE INDEX idx_event_feedback_questions_display_order ON public.event_feedback_questions(event_id, display_order);