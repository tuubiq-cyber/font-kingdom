
CREATE TABLE public.font_dataset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  font_name text NOT NULL,
  sample_image_url text NOT NULL,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  visual_hash text,
  verified_by_admin boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.font_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Font dataset publicly readable" ON public.font_dataset
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users manage font_dataset" ON public.font_dataset
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.manual_identification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uploaded_image text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  assigned_font_id uuid REFERENCES public.fonts_library(id) ON DELETE SET NULL,
  assigned_font_name text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

ALTER TABLE public.manual_identification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Queue publicly readable" ON public.manual_identification_queue
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users manage queue" ON public.manual_identification_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert to queue" ON public.manual_identification_queue
  FOR INSERT TO public WITH CHECK (true);
