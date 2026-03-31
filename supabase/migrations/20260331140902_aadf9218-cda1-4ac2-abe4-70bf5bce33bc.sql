
-- Drop permissive storage write policies
DROP POLICY IF EXISTS "Anyone can upload font files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update font files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete font files" ON storage.objects;

-- Authenticated users can upload to queue/ folder only
CREATE POLICY "Authenticated users upload queue images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fonts' AND
  (storage.foldername(name))[1] = 'queue'
);

-- Admins can upload/update/delete anywhere in fonts bucket
CREATE POLICY "Admins manage all font storage"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'fonts' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'fonts' AND has_role(auth.uid(), 'admin'::app_role));
