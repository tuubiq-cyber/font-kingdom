
-- 1. Fix site_visits: drop old permissive INSERT, add tighter one
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can insert visits" ON public.site_visits
  FOR INSERT TO public
  WITH CHECK (
    visitor_id IS NOT NULL
    AND length(visitor_id) <= 64
    AND id IS NOT NULL
  );

-- 2. Fix font_dataset: restrict public read to exclude queue URLs
DROP POLICY IF EXISTS "Font dataset publicly readable" ON public.font_dataset;
CREATE POLICY "Font dataset public non-queue readable" ON public.font_dataset
  FOR SELECT TO public
  USING (sample_image_url NOT LIKE '%/queue/%');

CREATE POLICY "Admins read all font_dataset" ON public.font_dataset
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Make fonts bucket private to enforce storage RLS
UPDATE storage.buckets SET public = false WHERE id = 'fonts';

-- 4. Update storage policies for signed URL access
DROP POLICY IF EXISTS "Non-queue font files are public" ON storage.objects;

CREATE POLICY "Authenticated users read non-queue fonts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] != 'queue');

CREATE POLICY "Public read non-queue fonts" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] != 'queue');
