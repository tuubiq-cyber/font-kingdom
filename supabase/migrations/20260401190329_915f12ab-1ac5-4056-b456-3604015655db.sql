
-- Restore rejected item back to pending
CREATE OR REPLACE FUNCTION public.admin_restore_queue_item(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_identification_queue
  SET status = 'pending', rejection_reason = NULL, resolved_at = NULL, resolved_by = NULL
  WHERE id = _id AND status = 'rejected';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or not rejected';
  END IF;
END;
$$;

-- Delete all rejected items
CREATE OR REPLACE FUNCTION public.admin_delete_all_rejected()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.manual_identification_queue WHERE status = 'rejected';
END;
$$;

-- Resolve a queue item
CREATE OR REPLACE FUNCTION public.admin_resolve_queue_item(
  _id uuid,
  _font_name text,
  _download_url text DEFAULT NULL,
  _font_file_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_identification_queue
  SET
    status = 'resolved',
    assigned_font_name = _font_name,
    admin_download_url = COALESCE(_font_file_url, _download_url),
    resolved_at = now(),
    needs_correction = false,
    is_notified = false
  WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
END;
$$;

-- Reject a queue item
CREATE OR REPLACE FUNCTION public.admin_reject_queue_item(
  _id uuid,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_identification_queue
  SET
    status = 'rejected',
    rejection_reason = _reason,
    resolved_at = now(),
    is_notified = false
  WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
END;
$$;
