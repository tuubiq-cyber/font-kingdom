
-- 1. Anon users can read their own queue items via visitor_id (scoped, not open)
-- This is handled via RPC get_my_queue_items, no direct SELECT policy needed.
-- Mark as intentional by not adding anon SELECT.

-- 2. Allow users to delete their own unverified font_dataset submissions
CREATE POLICY "Users delete own unverified font_dataset"
ON public.font_dataset FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND verified_by_admin = false
  AND NOT has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Allow users to update their own unverified font_dataset submissions
CREATE POLICY "Users update own unverified font_dataset"
ON public.font_dataset FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND verified_by_admin = false
  AND NOT has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  user_id = auth.uid()
  AND verified_by_admin = false
  AND admin_metadata = '{}'::jsonb
);
