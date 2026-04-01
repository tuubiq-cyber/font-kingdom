
DROP POLICY "Anyone can read own queue items" ON public.manual_identification_queue;

CREATE POLICY "Anyone can read own queue items"
ON public.manual_identification_queue FOR SELECT
TO public
USING (true);
