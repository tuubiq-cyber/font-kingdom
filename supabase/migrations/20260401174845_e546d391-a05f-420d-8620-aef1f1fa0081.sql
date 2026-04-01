
-- Restore fonts bucket to public - it only contains font previews and downloads, not user queue images
-- User queue images are stored in the private 'queue-images' bucket
UPDATE storage.buckets SET public = true WHERE id = 'fonts';
