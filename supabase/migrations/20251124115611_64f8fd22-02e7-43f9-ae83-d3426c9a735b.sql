-- Create table for OurSafeBase platform feedback
CREATE TABLE public.platform_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_text TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  page_context TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit platform feedback
CREATE POLICY "Anyone can submit platform feedback"
ON public.platform_feedback
FOR INSERT
WITH CHECK (true);

-- Only admins can view platform feedback
CREATE POLICY "Admins can view platform feedback"
ON public.platform_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX idx_platform_feedback_submitted_at ON public.platform_feedback(submitted_at DESC);
CREATE INDEX idx_platform_feedback_user_id ON public.platform_feedback(user_id) WHERE user_id IS NOT NULL;