DROP POLICY "Visits publicly readable" ON public.site_visits;

CREATE POLICY "Only admins can read visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));