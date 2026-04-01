CREATE POLICY "Anyone can delete pending queue items"
ON public.manual_identification_queue
FOR DELETE
TO public
USING (status = 'pending');