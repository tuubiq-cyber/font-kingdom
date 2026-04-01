
-- Drop old auth-only upload policy
DROP POLICY IF EXISTS "Authenticated users upload queue images" ON storage.objects;

-- Allow anyone to upload to queue/anon folder
CREATE POLICY "Anyone can upload queue images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = 'queue'
  AND (storage.foldername(name))[2] = 'anon'
);
