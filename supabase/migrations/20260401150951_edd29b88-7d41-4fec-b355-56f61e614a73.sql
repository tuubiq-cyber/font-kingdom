DROP POLICY "Anyone can update pending queue items" ON public.manual_identification_queue;
CREATE POLICY "Anyone can update pending or rejected queue items"
ON public.manual_identification_queue
FOR UPDATE
TO public
USING (status IN ('pending', 'rejected'))
WITH CHECK (true);