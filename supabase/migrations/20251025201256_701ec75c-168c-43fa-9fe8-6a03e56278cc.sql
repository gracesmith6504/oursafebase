-- Remove description column from societies table
ALTER TABLE public.societies DROP COLUMN description;

-- Create report_bookmarks table for bookmark feature
CREATE TABLE public.report_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- Enable RLS on report_bookmarks
ALTER TABLE public.report_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Committee members can view bookmarks for reports in their society's events
CREATE POLICY "Committee members can view bookmarks for their society reports"
ON public.report_bookmarks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.reports r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = report_bookmarks.report_id
      AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- RLS Policy: Committee members can create bookmarks for reports in their society's events
CREATE POLICY "Committee members can bookmark reports in their society"
ON public.report_bookmarks
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.reports r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = report_bookmarks.report_id
      AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- RLS Policy: Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
ON public.report_bookmarks
FOR DELETE
USING (user_id = auth.uid());