
CREATE TABLE public.font_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  font_id uuid NOT NULL REFERENCES public.fonts_library(id) ON DELETE CASCADE,
  weight text NOT NULL DEFAULT 'Regular',
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.font_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Font files publicly readable" ON public.font_files
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users manage font_files" ON public.font_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
