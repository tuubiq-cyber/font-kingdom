
-- Remove from Realtime (no IF EXISTS support)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.manual_identification_queue;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Table might not be in publication
END;
$$;

-- Clean up old storage policies on fonts bucket
DROP POLICY IF EXISTS "Anyone can upload queue images" ON storage.objects;
DROP POLICY IF EXISTS "Queue images restricted to owner and admins" ON storage.objects;
