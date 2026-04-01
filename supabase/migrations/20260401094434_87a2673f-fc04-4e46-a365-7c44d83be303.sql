
-- ==============================
-- LAYERED DEFENSE FOR user_roles
-- ==============================

-- 1. Drop existing permissive ALL policy (too broad)
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;

-- 2. Keep the existing restrictive ALL policy as first layer
-- "Only admins can modify roles" (RESTRICTIVE) — already exists

-- 3. Add granular PERMISSIVE policies per operation (second layer)

-- Admin SELECT (already have "Users can read own roles" for self-read)
CREATE POLICY "Admins read all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT — only admins, and cannot insert 'admin' role for themselves
CREATE POLICY "Admins insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id != auth.uid() -- admins cannot grant roles to themselves
);

-- Admin UPDATE — only admins
CREATE POLICY "Admins update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id != auth.uid() -- prevent self-escalation
);

-- Admin DELETE — only admins, cannot remove own role
CREATE POLICY "Admins delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id != auth.uid() -- prevent self-demotion attacks
);

-- 4. Add trigger to prevent the last admin from being removed
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin ON public.user_roles;
CREATE TRIGGER trg_prevent_last_admin
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_removal();
