
-- Recreate view with SECURITY INVOKER (default, non-definer)
DROP VIEW IF EXISTS public.font_dataset_public;

CREATE VIEW public.font_dataset_public AS
SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at,
       metadata_json - 'admin_notes' - 'font_file_url' - 'source' AS metadata_json
FROM public.font_dataset
WHERE sample_image_url NOT LIKE '%/queue/%';

ALTER VIEW public.font_dataset_public SET (security_invoker = true);

GRANT SELECT ON public.font_dataset_public TO anon;
GRANT SELECT ON public.font_dataset_public TO authenticated;
