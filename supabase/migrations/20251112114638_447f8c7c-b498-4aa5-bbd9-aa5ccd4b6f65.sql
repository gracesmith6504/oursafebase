-- Allow committee members to delete events
CREATE POLICY "Committee members can delete events"
ON public.events
FOR DELETE
USING (is_committee_member(auth.uid(), society_id));