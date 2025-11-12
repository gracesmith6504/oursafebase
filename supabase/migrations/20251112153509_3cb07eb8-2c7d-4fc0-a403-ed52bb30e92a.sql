-- Create user_consents table to track Terms of Service and Privacy Policy acceptance
CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_terms BOOLEAN NOT NULL DEFAULT true,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent
CREATE POLICY "Users can view own consent"
ON public.user_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own consent
CREATE POLICY "Users can insert own consent"
ON public.user_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);