CREATE OR REPLACE VIEW public.font_dataset_user
WITH (security_invoker = true)
AS
SELECT
  id,
  font_name,
  sample_image_url,
  visual_hash,
  verified_by_admin,
  created_at,
  user_id,
  metadata_json
FROM public.font_dataset
WHERE user_id = auth.uid();