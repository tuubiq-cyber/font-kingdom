
CREATE OR REPLACE FUNCTION public.mark_queue_notified(_id uuid, _user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_identification_queue
  SET is_notified = true
  WHERE id = _id
    AND (user_id::text = _user_id OR user_id IS NULL)
    AND status IN ('resolved', 'rejected');
END;
$$;
