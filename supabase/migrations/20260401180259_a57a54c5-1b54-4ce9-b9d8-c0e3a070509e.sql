UPDATE storage.buckets
SET public = false
WHERE id = 'fonts'
  AND public = true;

DROP POLICY IF EXISTS "Public read non-queue fonts" ON storage.objects;
DROP POLICY IF EXISTS "Auth read non-queue fonts" ON storage.objects;
DROP POLICY IF EXISTS "Admins read fonts queue" ON storage.objects;
DROP POLICY IF EXISTS "anon_select_queue_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_select_queue_images" ON storage.objects;
DROP POLICY IF EXISTS "service_role_select_queue_images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read fonts" ON storage.objects;
DROP POLICY IF EXISTS "Public read fonts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users read fonts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage fonts bucket objects" ON storage.objects;

CREATE POLICY "Admins manage fonts bucket objects"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'fonts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'fonts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);