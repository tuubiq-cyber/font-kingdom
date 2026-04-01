
-- Allow users to update only specific safe fields on their own pending queue items
CREATE POLICY "Users update own pending queue items"
ON public.manual_identification_queue
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND assigned_font_id IS NULL
    AND assigned_font_name IS NULL
    AND admin_download_url IS NULL
    AND resolved_by IS NULL
    AND resolved_at IS NULL
);

-- Allow users to delete only their own pending queue items
CREATE POLICY "Users delete own pending queue items"
ON public.manual_identification_queue
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    AND status = 'pending'
    AND NOT has_role(auth.uid(), 'admin'::app_role)
);
