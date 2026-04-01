
-- 1. Drop the policy that exposes admin_metadata to users
DROP POLICY IF EXISTS "Users read own font_dataset" ON public.font_dataset;

-- 2. Create a safe user-facing view WITHOUT admin_metadata (SECURITY INVOKER)
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
FROM public.font_dataset;

-- 3. Add RLS policy on base table scoped for the view
-- Users can only see their own rows (used by the SECURITY INVOKER view)
CREATE POLICY "Users read own font_dataset via view"
ON public.font_dataset
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    AND NOT has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Grant SELECT on the view to authenticated users
GRANT SELECT ON public.font_dataset_user TO authenticated;

-- 5. Revoke direct SELECT on base table from anon (admins keep access via their policy)
REVOKE SELECT ON public.font_dataset FROM anon;
