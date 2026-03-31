
CREATE TABLE public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  visitor_id text
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Visits publicly readable" ON public.site_visits FOR SELECT TO public USING (true);
