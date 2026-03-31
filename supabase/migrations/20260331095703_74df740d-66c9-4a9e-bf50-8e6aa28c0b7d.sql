
ALTER TABLE public.manual_identification_queue 
  ADD COLUMN IF NOT EXISTS admin_download_url text,
  ADD COLUMN IF NOT EXISTS user_confirmation boolean,
  ADD COLUMN IF NOT EXISTS is_notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_correction boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Enable realtime for the queue table
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_identification_queue;
