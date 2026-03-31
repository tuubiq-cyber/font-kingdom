
-- Constrain site_visits inserts to only allow visitor_id
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can insert visits"
ON public.site_visits FOR INSERT TO public
WITH CHECK (
  id IS NOT NULL AND
  visitor_id IS NOT NULL
);
