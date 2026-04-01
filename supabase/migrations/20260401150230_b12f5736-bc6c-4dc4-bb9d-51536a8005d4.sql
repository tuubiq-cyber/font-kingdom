CREATE POLICY "Anyone can update pending queue items"
ON public.manual_identification_queue
FOR UPDATE
TO public
USING (status = 'pending')
WITH CHECK (true);