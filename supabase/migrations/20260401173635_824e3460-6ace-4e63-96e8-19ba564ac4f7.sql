
-- Drop the dangerous public policies
DROP POLICY "Anyone can read own queue items" ON public.manual_identification_queue;
DROP POLICY "Anyone can delete pending queue items" ON public.manual_identification_queue;
DROP POLICY "Anyone can update pending or rejected queue items" ON public.manual_identification_queue;

-- Add restricted SELECT for authenticated users only
CREATE POLICY "Auth users read own queue items"
ON public.manual_identification_queue FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);
