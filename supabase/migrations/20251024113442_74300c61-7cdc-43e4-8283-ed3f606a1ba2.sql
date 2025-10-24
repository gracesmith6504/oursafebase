-- Create storage bucket for CoC files
INSERT INTO storage.buckets (id, name, public)
VALUES ('code-of-conduct-files', 'code-of-conduct-files', true);

-- RLS Policy: Committee members can upload files
CREATE POLICY "Committee members can upload CoC files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'code-of-conduct-files' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text
    FROM societies s
    WHERE is_committee_member(auth.uid(), s.id)
  )
);

-- RLS Policy: Anyone can view CoC files (public bucket)
CREATE POLICY "Anyone can view CoC files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'code-of-conduct-files');

-- RLS Policy: Committee members can delete their society's files
CREATE POLICY "Committee members can delete CoC files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'code-of-conduct-files' AND
  (storage.foldername(name))[1] IN (
    SELECT s.id::text
    FROM societies s
    WHERE is_committee_member(auth.uid(), s.id)
  )
);

-- Add file_url column to code_of_conduct table
ALTER TABLE code_of_conduct
ADD COLUMN file_url TEXT;

-- Make content nullable since files won't have text content
ALTER TABLE code_of_conduct
ALTER COLUMN content DROP NOT NULL;

-- Add constraint: either content OR file_url must be present
ALTER TABLE code_of_conduct
ADD CONSTRAINT content_or_file_required 
CHECK (
  (content IS NOT NULL AND content != '') OR 
  (file_url IS NOT NULL AND file_url != '')
);