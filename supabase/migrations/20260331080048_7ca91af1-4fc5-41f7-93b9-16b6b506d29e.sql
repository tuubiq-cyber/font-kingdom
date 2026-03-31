
CREATE TABLE public.fonts_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  font_name text NOT NULL,
  font_name_ar text NOT NULL,
  category text NOT NULL DEFAULT 'modern',
  style text NOT NULL DEFAULT 'Regular',
  license text DEFAULT 'مجاني',
  preview_image_url text,
  download_url text,
  visual_features_hash text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fonts_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fonts library publicly readable"
  ON public.fonts_library FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users manage fonts_library"
  ON public.fonts_library FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
