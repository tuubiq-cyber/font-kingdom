
-- 1. Remove direct INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert own logs" ON public.security_logs;

-- 2. Create secure insert function
CREATE OR REPLACE FUNCTION public.insert_security_log(_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed_actions text[] := ARRAY[
    'login_success', 'login_failed', 'logout', 'signup',
    'password_reset', 'password_change', 'session_start'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (_action = ANY(allowed_actions)) THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  INSERT INTO public.security_logs (user_id, action, created_at)
  VALUES (auth.uid(), _action, now());
END;
$$;

-- 3. Simplify has_role to remove self-referential OR
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
