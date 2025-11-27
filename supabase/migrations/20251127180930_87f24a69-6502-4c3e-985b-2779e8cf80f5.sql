-- Create table for found item claims
CREATE TABLE public.lost_found_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  contact_info TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  submitted_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'confirmed', 'rejected')),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.lost_found_claims ENABLE ROW LEVEL SECURITY;

-- Anyone who is a society member can submit a claim for items in their society's events
CREATE POLICY "Society members can submit claims"
ON public.lost_found_claims
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lost_found_items lfi
    JOIN events e ON e.id = lfi.event_id
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE lfi.id = lost_found_claims.item_id
    AND sm.user_id = auth.uid()
  )
);

-- Committee members can view all claims for their society's events
CREATE POLICY "Committee members can view claims"
ON public.lost_found_claims
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lost_found_items lfi
    JOIN events e ON e.id = lfi.event_id
    WHERE lfi.id = lost_found_claims.item_id
    AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- Committee members can update claims
CREATE POLICY "Committee members can update claims"
ON public.lost_found_claims
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM lost_found_items lfi
    JOIN events e ON e.id = lfi.event_id
    WHERE lfi.id = lost_found_claims.item_id
    AND is_committee_member(auth.uid(), e.society_id)
  )
);

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
ON public.lost_found_claims
FOR SELECT
USING (submitted_by = auth.uid());

-- Add policy for public viewing of found items (no personal data)
CREATE POLICY "Society members can view found items publicly"
ON public.lost_found_items
FOR SELECT
USING (
  type = 'found' AND status = 'open' AND
  EXISTS (
    SELECT 1 FROM events e
    JOIN society_members sm ON sm.society_id = e.society_id
    WHERE e.id = lost_found_items.event_id
    AND sm.user_id = auth.uid()
  )
);