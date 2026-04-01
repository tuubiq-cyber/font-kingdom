
-- 1. Fix anon insert policy: require user_id IS NULL to prevent impersonation
DROP POLICY "Anon users insert queue items" ON public.manual_identification_queue;

CREATE POLICY "Anon users insert queue items"
ON public.manual_identification_queue FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL
  AND status = 'pending'
  AND assigned_font_id IS NULL
  AND assigned_font_name IS NULL
  AND admin_download_url IS NULL
  AND resolved_by IS NULL
  AND resolved_at IS NULL
  AND is_notified = false
  AND needs_correction = false
  AND user_confirmation IS NULL
);

-- 2. Convert fonts bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'fonts';
