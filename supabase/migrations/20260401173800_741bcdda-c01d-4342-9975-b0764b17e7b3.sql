
-- Fix anon INSERT: validate visitor_id format (not a UUID pattern)
DROP POLICY "Anon users insert queue items" ON public.manual_identification_queue;

CREATE POLICY "Anon users insert queue items"
ON public.manual_identification_queue FOR INSERT TO anon
WITH CHECK (
  user_id IS NOT NULL
  -- Visitor IDs are hex strings from crypto, not valid UUIDs
  AND user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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

-- Allow authenticated users to read their own queue-images files
CREATE POLICY "Auth users read own queue-images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'queue-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
