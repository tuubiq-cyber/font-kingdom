CREATE OR REPLACE FUNCTION public.get_unique_visitor_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT visitor_id) FROM public.site_visits;
$$;