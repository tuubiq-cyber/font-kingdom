
-- Fix INSERT policy: restrict user_id for anon users
DROP POLICY "Anyone can insert queue items" ON public.manual_identification_queue;

-- For authenticated users: must use their own auth.uid()
CREATE POLICY "Auth users insert own queue items"
ON public.manual_identification_queue FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
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

-- For anon users: user_id must be a non-null visitor_id string (not a real user UUID)
CREATE POLICY "Anon users insert queue items"
ON public.manual_identification_queue FOR INSERT TO anon
WITH CHECK (
  user_id IS NOT NULL
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
