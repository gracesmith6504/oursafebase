-- Create event_notes table for internal committee notes
CREATE TABLE public.event_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;

-- Committee members can view notes for their society events
CREATE POLICY "Committee members can view event notes"
  ON public.event_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_notes.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

-- Committee members can create notes
CREATE POLICY "Committee members can create event notes"
  ON public.event_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_notes.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

-- Committee members can update notes
CREATE POLICY "Committee members can update event notes"
  ON public.event_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_notes.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

-- Committee members can delete their own notes
CREATE POLICY "Committee members can delete own notes"
  ON public.event_notes FOR DELETE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_notes.event_id
      AND is_committee_member(auth.uid(), e.society_id)
    )
  );

-- Indexes for performance
CREATE INDEX idx_event_notes_event_id ON public.event_notes(event_id);
CREATE INDEX idx_event_notes_pinned ON public.event_notes(event_id, is_pinned) WHERE is_pinned = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_event_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_notes_updated_at
  BEFORE UPDATE ON public.event_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_notes_updated_at();