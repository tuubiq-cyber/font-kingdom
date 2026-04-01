
CREATE POLICY "anon_select_queue_images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] = 'queue');
