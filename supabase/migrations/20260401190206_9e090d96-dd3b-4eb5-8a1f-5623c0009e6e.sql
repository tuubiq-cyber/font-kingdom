
-- Create a SECURITY DEFINER function for fetching all queue items (admin use)
CREATE OR REPLACE FUNCTION public.get_all_queue_items()
RETURNS SETOF manual_identification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM public.manual_identification_queue
    ORDER BY needs_correction DESC, created_at DESC;
END;
$$;

-- Create a SECURITY DEFINER function for updating queue items (admin use)
CREATE OR REPLACE FUNCTION public.admin_update_queue_item(
  _id uuid,
  _status text,
  _assigned_font_name text DEFAULT NULL,
  _assigned_font_id uuid DEFAULT NULL,
  _admin_download_url text DEFAULT NULL,
  _rejection_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_identification_queue
  SET
    status = _status,
    assigned_font_name = COALESCE(_assigned_font_name, assigned_font_name),
    assigned_font_id = _assigned_font_id,
    admin_download_url = COALESCE(_admin_download_url, admin_download_url),
    rejection_reason = _rejection_reason,
    resolved_at = CASE WHEN _status IN ('resolved', 'rejected') THEN now() ELSE resolved_at END,
    is_notified = false
  WHERE id = _id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
END;
$$;

-- Function to delete queue items (admin use)
CREATE OR REPLACE FUNCTION public.admin_delete_queue_item(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.manual_identification_queue WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
END;
$$;
