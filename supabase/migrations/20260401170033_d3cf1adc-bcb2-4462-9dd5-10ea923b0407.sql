
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can update pending or rejected queue items" ON public.manual_identification_queue;

-- Recreate with restricted WITH CHECK: public users can only update image, query_text, and reset status to pending (resubmission), but cannot touch admin fields
CREATE POLICY "Anyone can update pending or rejected queue items"
ON public.manual_identification_queue
FOR UPDATE
TO public
USING (status = ANY (ARRAY['pending'::text, 'rejected'::text]))
WITH CHECK (
  status = 'pending'
  AND assigned_font_id IS NULL
  AND assigned_font_name IS NULL
  AND admin_download_url IS NULL
  AND resolved_by IS NULL
  AND resolved_at IS NULL
  AND is_notified = false
  AND rejection_reason IS NULL
);
