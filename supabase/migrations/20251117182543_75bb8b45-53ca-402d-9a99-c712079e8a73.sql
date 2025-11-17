-- Create feedback_responses table
CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback_answers table
CREATE TABLE public.feedback_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES public.feedback_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.event_feedback_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_rating INTEGER CHECK (answer_rating >= 1 AND answer_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_responses
CREATE POLICY "Society members can submit feedback responses"
  ON public.feedback_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN society_members sm ON sm.society_id = e.society_id
      WHERE e.id = feedback_responses.event_id
        AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Committee members can view all responses"
  ON public.feedback_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = feedback_responses.event_id
        AND is_committee_member(auth.uid(), e.society_id)
    )
  );

CREATE POLICY "Users can view their own responses"
  ON public.feedback_responses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for feedback_answers
CREATE POLICY "Users can insert their own answers"
  ON public.feedback_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_responses fr
      WHERE fr.id = feedback_answers.response_id
        AND (fr.user_id = auth.uid() OR fr.user_id IS NULL)
    )
  );

CREATE POLICY "Committee members can view all answers"
  ON public.feedback_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_responses fr
      JOIN events e ON e.id = fr.event_id
      WHERE fr.id = feedback_answers.response_id
        AND is_committee_member(auth.uid(), e.society_id)
    )
  );

CREATE POLICY "Users can view their own answers"
  ON public.feedback_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_responses fr
      WHERE fr.id = feedback_answers.response_id
        AND fr.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_feedback_responses_event_id ON public.feedback_responses(event_id);
CREATE INDEX idx_feedback_responses_user_id ON public.feedback_responses(user_id);
CREATE INDEX idx_feedback_answers_response_id ON public.feedback_answers(response_id);
CREATE INDEX idx_feedback_answers_question_id ON public.feedback_answers(question_id);