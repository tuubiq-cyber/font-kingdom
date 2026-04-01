
-- RPC: Get own queue items by visitor_id
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
    WHERE user_id::text = _visitor_id
    ORDER BY created_at DESC;
END;
$$;

-- RPC: Delete own pending queue item
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
    AND user_id::text = _visitor_id
    AND status = 'pending';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or not deletable';
  END IF;
END;
$$;

-- RPC: Resubmit a rejected queue item
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
    AND user_id::text = _visitor_id
    AND status = 'rejected';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or not resubmittable';
  END IF;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_my_queue_items(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_pending_item(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_queue_item(uuid, text, text, text) TO anon, authenticated;
