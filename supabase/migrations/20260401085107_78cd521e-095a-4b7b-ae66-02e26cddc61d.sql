
-- Remove the public SELECT policy that exposes admin_metadata
DROP POLICY IF EXISTS "Font dataset public safe readable" ON public.font_dataset;

-- Ensure the secure view grants are in place
GRANT SELECT ON public.font_dataset_public TO anon;
GRANT SELECT ON public.font_dataset_public TO authenticated;

-- Add verified filter to the view for extra safety
CREATE OR REPLACE VIEW public.font_dataset_public AS
SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at,
       metadata_json - 'admin_notes' - 'font_file_url' - 'source' AS metadata_json
FROM public.font_dataset
WHERE sample_image_url NOT LIKE '%/queue/%'
  AND verified_by_admin = true;

ALTER VIEW public.font_dataset_public SET (security_invoker = false);

-- Allow authenticated users to insert into font_dataset (for user confirmation flow)
CREATE POLICY "Authenticated users insert font_dataset" ON public.font_dataset
FOR INSERT TO authenticated
WITH CHECK (true);
