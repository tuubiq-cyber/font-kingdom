-- Fix storage policy: enforce user path in queue folder
DO $$
BEGIN
  -- Drop existing policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users upload queue images' 
    AND tablename = 'objects' 
    AND schemaname = 'storage'
  ) THEN
    DROP POLICY "Authenticated users upload queue images" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Authenticated users upload queue images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = 'queue'
  AND (storage.foldername(name))[2] = auth.uid()::text
);