
-- Remove the public policy that exposes admin_metadata via direct table access
DROP POLICY IF EXISTS "Public read verified font_dataset for view" ON public.font_dataset;

-- Recreate view as security definer (intentionally - to hide sensitive columns)
DROP VIEW IF EXISTS public.font_dataset_public;
CREATE VIEW public.font_dataset_public AS
  SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at,
         metadata_json - 'admin_notes' - 'font_file_url' - 'source' AS metadata_json
  FROM public.font_dataset
  WHERE verified_by_admin = true
    AND sample_image_url NOT LIKE '%/queue/%';

GRANT SELECT ON public.font_dataset_public TO anon;
GRANT SELECT ON public.font_dataset_public TO authenticated;
