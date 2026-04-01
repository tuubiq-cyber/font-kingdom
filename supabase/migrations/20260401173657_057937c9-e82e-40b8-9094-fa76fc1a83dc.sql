
-- Drop and recreate views with security_invoker
DROP VIEW IF EXISTS public.font_dataset_public;
DROP VIEW IF EXISTS public.font_dataset_user;

CREATE VIEW public.font_dataset_public
WITH (security_invoker = true)
AS
SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at, metadata_json
FROM public.font_dataset
WHERE verified_by_admin = true
AND sample_image_url NOT LIKE '%/queue/%';

CREATE VIEW public.font_dataset_user
WITH (security_invoker = true)
AS
SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at, user_id, metadata_json
FROM public.font_dataset;

-- Storage policies for queue-images
CREATE POLICY "Auth delete own queue-images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'queue-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins delete queue-images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'queue-images'
  AND public.has_role(auth.uid(), 'admin')
);
