-- Drop NOT NULL constraint on society_id to allow event-level CoCs
-- This aligns with the check_coc_scope constraint that requires exactly one of society_id or event_id
ALTER TABLE public.code_of_conduct ALTER COLUMN society_id DROP NOT NULL;