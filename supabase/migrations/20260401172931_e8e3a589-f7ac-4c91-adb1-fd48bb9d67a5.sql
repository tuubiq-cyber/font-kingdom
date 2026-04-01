
-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Anyone can upload queue images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload own queue images" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all queue images" ON storage.objects;
DROP POLICY IF EXISTS "Users read own queue images" ON storage.objects;

-- Recreate with unique names
CREATE POLICY "Anon upload to queue-images bucket"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'queue-images'
  AND (storage.foldername(name))[1] = 'anon'
);

CREATE POLICY "Auth upload own queue-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'queue-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins read queue-images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'queue-images'
  AND public.has_role(auth.uid(), 'admin')
);
