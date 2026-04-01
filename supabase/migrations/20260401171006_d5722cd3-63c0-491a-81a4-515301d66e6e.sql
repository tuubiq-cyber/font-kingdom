
-- Drop the overly permissive anon storage policy that grants public SELECT on queue images
DROP POLICY IF EXISTS "anon_select_queue_images" ON storage.objects;
