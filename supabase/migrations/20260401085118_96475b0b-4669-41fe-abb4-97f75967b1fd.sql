
-- Fix SECURITY DEFINER view warning - use INVOKER instead
ALTER VIEW public.font_dataset_public SET (security_invoker = true);

-- Need a SELECT policy on underlying table for the view to work with security invoker
CREATE POLICY "View can read verified public font_dataset" ON public.font_dataset
FOR SELECT TO authenticated
USING (sample_image_url NOT LIKE '%/queue/%' AND verified_by_admin = true);

-- Also allow anon to read verified entries (for the public view)
CREATE POLICY "Anon can read verified font_dataset" ON public.font_dataset
FOR SELECT TO anon
USING (sample_image_url NOT LIKE '%/queue/%' AND verified_by_admin = true);

-- Tighten insert policy - restrict which fields users can set
DROP POLICY IF EXISTS "Authenticated users insert font_dataset" ON public.font_dataset;
CREATE POLICY "Authenticated users insert font_dataset" ON public.font_dataset
FOR INSERT TO authenticated
WITH CHECK (
  verified_by_admin = false
  AND admin_metadata = '{}'::jsonb
);
