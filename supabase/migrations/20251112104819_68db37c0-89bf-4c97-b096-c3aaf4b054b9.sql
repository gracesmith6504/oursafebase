-- Add logo_url column to societies table
ALTER TABLE societies 
ADD COLUMN logo_url text NULL;

COMMENT ON COLUMN societies.logo_url IS 'URL to the society logo stored in Supabase storage';

-- Create storage bucket for society logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('society-logos', 'society-logos', true);

-- RLS policy: Anyone can view logos (bucket is public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'society-logos');

-- RLS policy: Authenticated users can upload logos
CREATE POLICY "Authenticated users can upload society logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'society-logos');

-- RLS policy: Society creators can update their society's logo
CREATE POLICY "Society creators can update their logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'society-logos');

-- RLS policy: Society creators can delete their society's logo
CREATE POLICY "Society creators can delete their logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'society-logos');

-- Update RLS policy to allow creator_email changes during ownership transfer
DROP POLICY IF EXISTS "Creators and committee can update societies" ON societies;

CREATE POLICY "Creators and committee can update societies"
ON societies
FOR UPDATE
USING (
  is_committee_member(auth.uid(), id)
)
WITH CHECK (
  -- Creators can update everything except is_verified
  -- They can also transfer ownership by updating creator_email
  (is_society_creator(auth.uid(), id) AND is_verified = (SELECT is_verified FROM societies WHERE societies.id = societies.id))
  OR
  -- Committee can only update name, slug, and logo_url (not creator_email or is_verified)
  (is_committee_member(auth.uid(), id) 
   AND creator_email = (SELECT creator_email FROM societies WHERE societies.id = societies.id)
   AND is_verified = (SELECT is_verified FROM societies WHERE societies.id = societies.id))
);