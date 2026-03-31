
-- Drop the permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert to queue" ON public.manual_identification_queue;

-- Create a strict insert policy: authenticated users only, locked to their own ID, clean pending state
CREATE POLICY "Authenticated users insert own queue items"
ON public.manual_identification_queue
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  status = 'pending' AND
  assigned_font_id IS NULL AND
  assigned_font_name IS NULL AND
  admin_download_url IS NULL AND
  resolved_by IS NULL AND
  resolved_at IS NULL AND
  is_notified = false AND
  needs_correction = false AND
  user_confirmation IS NULL
);
