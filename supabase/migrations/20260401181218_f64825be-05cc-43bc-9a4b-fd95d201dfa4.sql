INSERT INTO storage.buckets (id, name, public)
VALUES ('queue-images', 'queue-images', false)
ON CONFLICT (id) DO NOTHING;