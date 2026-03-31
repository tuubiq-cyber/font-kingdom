
ALTER TABLE public.fonts_library ADD COLUMN IF NOT EXISTS reference_image_url text DEFAULT NULL;
