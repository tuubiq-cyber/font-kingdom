
-- Add visitor_id column for anonymous tracking
ALTER TABLE public.manual_identification_queue
ADD COLUMN IF NOT EXISTS visitor_id text;

-- Update existing anon rows: move user_id to visitor_id where user_id doesn't match any auth user
UPDATE public.manual_identification_queue mq
SET visitor_id = mq.user_id::text, user_id = NULL
WHERE mq.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = mq.user_id);

-- Update RPC: get_my_queue_items to check both user_id and visitor_id
CREATE OR REPLACE FUNCTION public.get_my_queue_items(_visitor_id text)
RETURNS SETOF public.manual_identification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _visitor_id IS NULL OR length(trim(_visitor_id)) < 8 THEN
    RAISE EXCEPTION 'Invalid visitor_id';
  END IF;
  
  RETURN QUERY
    SELECT * FROM public.manual_identification_queue
    WHERE visitor_id = _visitor_id
       OR user_id::text = _visitor_id
    ORDER BY created_at DESC;
END;
$$;

-- Update RPC: delete_my_pending_item
CREATE OR REPLACE FUNCTION public.delete_my_pending_item(_id uuid, _visitor_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _visitor_id IS NULL OR length(trim(_visitor_id)) < 8 THEN
    RAISE EXCEPTION 'Invalid visitor_id';
  END IF;
  
  DELETE FROM public.manual_identification_queue
  WHERE id = _id
    AND (visitor_id = _visitor_id OR user_id::text = _visitor_id)
    AND status = 'pending';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or not deletable';
  END IF;
END;
$$;

-- Update RPC: resubmit_queue_item
CREATE OR REPLACE FUNCTION public.resubmit_queue_item(
  _id uuid,
  _visitor_id text,
  _new_image_url text DEFAULT NULL,
  _new_query_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _visitor_id IS NULL OR length(trim(_visitor_id)) < 8 THEN
    RAISE EXCEPTION 'Invalid visitor_id';
  END IF;
  
  UPDATE public.manual_identification_queue
  SET
    status = 'pending',
    rejection_reason = NULL,
    resolved_at = NULL,
    resolved_by = NULL,
    assigned_font_name = NULL,
    assigned_font_id = NULL,
    admin_download_url = NULL,
    is_notified = false,
    needs_correction = true,
    user_uploaded_image = COALESCE(_new_image_url, user_uploaded_image),
    query_text = COALESCE(_new_query_text, query_text)
  WHERE id = _id
    AND (visitor_id = _visitor_id OR user_id::text = _visitor_id)
    AND status = 'rejected';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or not resubmittable';
  END IF;
END;
$$;

-- Update mark_queue_notified too
CREATE OR REPLACE FUNCTION public.mark_queue_notified(_id uuid, _user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.manual_identification_queue
  SET is_notified = true
  WHERE id = _id
    AND (user_id::text = _user_id OR visitor_id = _user_id)
    AND status IN ('resolved', 'rejected');
END;
$$;

-- Update anon insert policy to allow visitor_id
DROP POLICY "Anon users insert queue items" ON public.manual_identification_queue;

CREATE POLICY "Anon users insert queue items"
ON public.manual_identification_queue FOR INSERT TO anon
WITH CHECK (
  user_id IS NULL
  AND visitor_id IS NOT NULL
  AND length(visitor_id) >= 8
  AND length(visitor_id) <= 64
  AND status = 'pending'
  AND assigned_font_id IS NULL
  AND assigned_font_name IS NULL
  AND admin_download_url IS NULL
  AND resolved_by IS NULL
  AND resolved_at IS NULL
  AND is_notified = false
  AND needs_correction = false
  AND user_confirmation IS NULL
);
