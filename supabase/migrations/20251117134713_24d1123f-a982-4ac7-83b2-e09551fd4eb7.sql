-- Create event_faqs table
CREATE TABLE event_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_event_faqs_event_id ON event_faqs(event_id);
CREATE INDEX idx_event_faqs_display_order ON event_faqs(event_id, display_order);

-- Enable RLS
ALTER TABLE event_faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view visible FAQs
CREATE POLICY "Anyone can view visible FAQs"
ON event_faqs
FOR SELECT
USING (is_visible = true OR EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = event_faqs.event_id
  AND is_committee_member(auth.uid(), e.society_id)
));

-- RLS Policy: Committee members can manage FAQs
CREATE POLICY "Committee members can manage FAQs"
ON event_faqs
FOR ALL
USING (EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = event_faqs.event_id
  AND is_committee_member(auth.uid(), e.society_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM events e
  WHERE e.id = event_faqs.event_id
  AND is_committee_member(auth.uid(), e.society_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_event_faqs_updated_at
  BEFORE UPDATE ON event_faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_event_notes_updated_at();