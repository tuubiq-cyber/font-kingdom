-- Create fonts table
CREATE TABLE public.fonts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'Regular',
  license TEXT DEFAULT 'مجاني',
  file_url TEXT,
  preview_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fonts ENABLE ROW LEVEL SECURITY;

-- Anyone can view fonts
CREATE POLICY "Fonts are publicly readable" ON public.fonts FOR SELECT USING (true);

-- Allow all operations (no auth for now)
CREATE POLICY "Allow all font management" ON public.fonts FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for font files
INSERT INTO storage.buckets (id, name, public) VALUES ('fonts', 'fonts', true);

-- Public read access for font files
CREATE POLICY "Font files are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'fonts');

-- Allow uploads to fonts bucket
CREATE POLICY "Anyone can upload font files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fonts');
CREATE POLICY "Anyone can update font files" ON storage.objects FOR UPDATE USING (bucket_id = 'fonts');
CREATE POLICY "Anyone can delete font files" ON storage.objects FOR DELETE USING (bucket_id = 'fonts');