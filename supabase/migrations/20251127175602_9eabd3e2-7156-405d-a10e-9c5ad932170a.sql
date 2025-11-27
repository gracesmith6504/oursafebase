-- Create lost_found_items table
CREATE TABLE public.lost_found_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  contact_info TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'claimed')),
  notes TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Create event_custom_categories table for custom Lost & Found categories per event
CREATE TABLE public.event_custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, category_name)
);

-- Enable RLS
ALTER TABLE public.lost_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_custom_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lost_found_items

-- Society members can submit lost/found items
CREATE POLICY "Society members can submit lost/found items"
ON public.lost_found_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = lost_found_items.event_id
    AND sm.user_id = (SELECT auth.uid())
  )
);

-- Society members can view lost/found items for their events
CREATE POLICY "Society members can view lost/found items"
ON public.lost_found_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = lost_found_items.event_id
    AND sm.user_id = (SELECT auth.uid())
  )
);

-- Committee members can update lost/found items
CREATE POLICY "Committee members can update lost/found items"
ON public.lost_found_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = lost_found_items.event_id
    AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);

-- RLS Policies for event_custom_categories

-- Society members can view custom categories
CREATE POLICY "Society members can view custom categories"
ON public.event_custom_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = event_custom_categories.event_id
    AND sm.user_id = (SELECT auth.uid())
  )
);

-- Committee members can manage custom categories
CREATE POLICY "Committee members can manage custom categories"
ON public.event_custom_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_custom_categories.event_id
    AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_custom_categories.event_id
    AND is_committee_member((SELECT auth.uid()), e.society_id)
  )
);