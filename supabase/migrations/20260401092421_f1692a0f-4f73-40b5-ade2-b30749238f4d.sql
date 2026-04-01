
-- 1. Remove public SELECT policies from font_dataset (use view instead)
DROP POLICY IF EXISTS "View can read verified public font_dataset" ON public.font_dataset;
DROP POLICY IF EXISTS "Anon can read verified font_dataset" ON public.font_dataset;
DROP POLICY IF EXISTS "Font dataset public safe readable" ON public.font_dataset;
DROP POLICY IF EXISTS "Font dataset public non-queue readable" ON public.font_dataset;

-- 2. Ensure the view strips sensitive columns and grant access
DROP VIEW IF EXISTS public.font_dataset_public;
CREATE VIEW public.font_dataset_public AS
  SELECT id, font_name, sample_image_url, visual_hash, verified_by_admin, created_at,
         metadata_json - 'admin_notes' - 'font_file_url' - 'source' AS metadata_json
  FROM public.font_dataset
  WHERE verified_by_admin = true
    AND sample_image_url NOT LIKE '%/queue/%';

GRANT SELECT ON public.font_dataset_public TO anon;
GRANT SELECT ON public.font_dataset_public TO authenticated;

-- 3. Add policy so authenticated users can read their own font_dataset entries
CREATE POLICY "Users read own font_dataset" ON public.font_dataset
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4. Remove any direct INSERT on security_logs (use RPC only)
DROP POLICY IF EXISTS "Authenticated users can insert own logs" ON public.security_logs;
DROP POLICY IF EXISTS "Users insert own security logs" ON public.security_logs;
