
-- Add admin-only metadata column
ALTER TABLE public.font_dataset ADD COLUMN IF NOT EXISTS admin_metadata jsonb DEFAULT '{}'::jsonb;

-- Move existing sensitive keys from metadata_json to admin_metadata
UPDATE public.font_dataset
SET admin_metadata = jsonb_build_object('admin_notes', metadata_json->'admin_notes', 'font_file_url', metadata_json->'font_file_url', 'source', metadata_json->'source'),
    metadata_json = metadata_json - 'admin_notes' - 'font_file_url' - 'source'
WHERE metadata_json ? 'admin_notes' OR metadata_json ? 'font_file_url' OR metadata_json ? 'source';

-- Remove old public policy
DROP POLICY IF EXISTS "Font dataset public non-queue readable" ON public.font_dataset;

-- Create secure view that strips sensitive keys
CREATE OR REPLACE VIEW public.font_dataset_public WITH (security_barrier = true) AS
SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at,
       metadata_json - 'admin_notes' - 'font_file_url' - 'source' AS metadata_json
FROM public.font_dataset
WHERE sample_image_url NOT LIKE '%/queue/%';

GRANT SELECT ON public.font_dataset_public TO anon;
GRANT SELECT ON public.font_dataset_public TO authenticated;
