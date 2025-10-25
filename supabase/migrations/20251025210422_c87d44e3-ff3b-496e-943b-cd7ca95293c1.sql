-- Add contact_phone column to event_feedback table
ALTER TABLE public.event_feedback 
ADD COLUMN IF NOT EXISTS contact_phone text;