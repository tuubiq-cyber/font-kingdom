
-- =============================================
-- ZERO-TRUST HARDENING: font_dataset + security_logs
-- =============================================

-- 1. Remove the policy that lets anon/authenticated read font_dataset directly
DROP POLICY IF EXISTS "Public read verified font_dataset for view" ON public.font_dataset;

-- 2. Revoke direct SELECT on font_dataset from anon (force view usage)
REVOKE SELECT ON public.font_dataset FROM anon;

-- 3. Recreate the public view as SECURITY DEFINER (owner=postgres)
--    to bypass RLS, exposing ONLY safe columns
DROP VIEW IF EXISTS public.font_dataset_public;

CREATE VIEW public.font_dataset_public
WITH (security_barrier = true)
AS
SELECT
  id,
  font_name,
  sample_image_url,
  visual_hash,
  verified_by_admin,
  created_at,
  -- Strip all sensitive keys from metadata_json
  (metadata_json - 'admin_notes' - 'font_file_url' - 'source') AS metadata_json
FROM public.font_dataset
WHERE verified_by_admin = true
  AND sample_image_url NOT LIKE '%/queue/%';

-- 4. Grant read-only on the view, revoke writes
GRANT SELECT ON public.font_dataset_public TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.font_dataset_public FROM anon, authenticated;

-- 5. Block direct INSERT on security_logs for all roles (force RPC usage)
DROP POLICY IF EXISTS "Authenticated users can insert own logs" ON public.security_logs;

CREATE POLICY "Block direct insert on security_logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Ensure anon can never touch security_logs
REVOKE ALL ON public.security_logs FROM anon;
