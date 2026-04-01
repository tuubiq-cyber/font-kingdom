
-- 1. Fix has_role() to prevent role enumeration
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (
        _user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
  )
$$;

-- 2. Remove anon INSERT policy on security_logs to prevent log flooding
DROP POLICY IF EXISTS "Anon can insert logs" ON public.security_logs;

-- 3. Restrict queue/ prefix in storage to admins only
DROP POLICY IF EXISTS "Font files are publicly accessible" ON storage.objects;

CREATE POLICY "Non-queue font files are public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'fonts' AND (storage.foldername(name))[1] != 'queue');

CREATE POLICY "Queue images restricted to owner and admins"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fonts' AND
    (storage.foldername(name))[1] = 'queue' AND
    (
      (storage.foldername(name))[2] = (auth.uid())::text
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );
