
-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users insert own queue items" ON public.manual_identification_queue;

-- Allow anyone (including anon) to insert pending queue items
CREATE POLICY "Anyone can insert queue items"
ON public.manual_identification_queue
FOR INSERT
TO public
WITH CHECK (
  status = 'pending'
  AND assigned_font_id IS NULL
  AND assigned_font_name IS NULL
  AND admin_download_url IS NULL
  AND resolved_by IS NULL
  AND resolved_at IS NULL
  AND is_notified = false
  AND needs_correction = false
  AND user_confirmation IS NULL
);

-- Allow anyone to read their own items by visitor_id or user_id
DROP POLICY IF EXISTS "Authenticated users read own queue items" ON public.manual_identification_queue;

CREATE POLICY "Anyone can read own queue items"
ON public.manual_identification_queue
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR user_id IS NULL
);
