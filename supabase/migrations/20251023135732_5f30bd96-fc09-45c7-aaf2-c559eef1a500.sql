-- Add email notification preferences to society_members
ALTER TABLE public.society_members
ADD COLUMN email_notifications_enabled boolean NOT NULL DEFAULT true;

-- Add index for efficient filtering
CREATE INDEX idx_society_members_notifications ON public.society_members(society_id, role, email_notifications_enabled);