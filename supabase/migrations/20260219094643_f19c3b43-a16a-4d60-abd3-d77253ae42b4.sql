
-- Fix events.created_by: change from NO ACTION to SET NULL
ALTER TABLE public.events
  DROP CONSTRAINT events_created_by_fkey;

ALTER TABLE public.events
  ADD CONSTRAINT events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix lost_found_claims.submitted_by: change from NO ACTION to SET NULL
ALTER TABLE public.lost_found_claims
  DROP CONSTRAINT lost_found_claims_submitted_by_fkey;

ALTER TABLE public.lost_found_claims
  ADD CONSTRAINT lost_found_claims_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
