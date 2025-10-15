-- Add reporter_phone column to separate phone from name
ALTER TABLE public.reports 
ADD COLUMN reporter_phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.reports.reporter_phone 
IS 'Phone number of reporter if they chose to provide contact info';

-- Create index for better query performance on status filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- Create index for event_id lookups (used heavily in committee views)
CREATE INDEX IF NOT EXISTS idx_reports_event_id ON public.reports(event_id);