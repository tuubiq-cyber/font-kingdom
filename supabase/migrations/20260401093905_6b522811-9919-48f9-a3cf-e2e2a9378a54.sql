
-- Convert font_dataset_public from SECURITY DEFINER to SECURITY INVOKER
DROP VIEW IF EXISTS public.font_dataset_public;

CREATE VIEW public.font_dataset_public
WITH (security_invoker = true) AS
  SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at,
         metadata_json - 'admin_notes' - 'font_file_url' - 'source' AS metadata_json
  FROM public.font_dataset
  WHERE verified_by_admin = true
    AND sample_image_url NOT LIKE '%/queue/%';

GRANT SELECT ON public.font_dataset_public TO anon;
GRANT SELECT ON public.font_dataset_public TO authenticated;

-- Add a limited public SELECT policy for the view to work (only verified, non-queue rows)
DROP POLICY IF EXISTS "Public read verified font_dataset for view" ON public.font_dataset;
CREATE POLICY "Public read verified font_dataset for view" ON public.font_dataset
FOR SELECT TO anon, authenticated
USING (verified_by_admin = true AND sample_image_url NOT LIKE '%/queue/%');
