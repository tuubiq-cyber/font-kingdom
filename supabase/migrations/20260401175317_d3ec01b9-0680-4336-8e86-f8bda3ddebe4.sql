
-- Convert legacy public URLs to storage paths
-- e.g. https://xxx.supabase.co/storage/v1/object/public/fonts/queue/file.png -> queue/file.png
UPDATE public.manual_identification_queue
SET user_uploaded_image = regexp_replace(
  user_uploaded_image,
  '^https?://[^/]+/storage/v1/object/public/fonts/',
  ''
)
WHERE user_uploaded_image LIKE '%/storage/v1/object/public/fonts/queue/%';

-- Remove the public read policy for queue/ folder
DROP POLICY IF EXISTS "Public read non-queue fonts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users read non-queue fonts" ON storage.objects;

-- Recreate: public can read fonts bucket EXCEPT queue/ folder
CREATE POLICY "Public read non-queue fonts"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] != 'queue');

CREATE POLICY "Auth read non-queue fonts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] != 'queue');

-- Admins can read queue/ in fonts bucket (for legacy images)
CREATE POLICY "Admins read fonts queue"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] = 'queue' AND has_role(auth.uid(), 'admin'::app_role));
