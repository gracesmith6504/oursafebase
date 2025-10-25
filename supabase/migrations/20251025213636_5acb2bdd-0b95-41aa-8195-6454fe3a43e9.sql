-- Add event_end_date column to events table for multi-day events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_end_date timestamp with time zone;