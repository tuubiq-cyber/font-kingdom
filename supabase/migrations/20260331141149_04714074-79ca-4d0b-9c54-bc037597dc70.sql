
-- Add restrictive policy to ensure only admins can modify user_roles
CREATE POLICY "Only admins can modify roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
