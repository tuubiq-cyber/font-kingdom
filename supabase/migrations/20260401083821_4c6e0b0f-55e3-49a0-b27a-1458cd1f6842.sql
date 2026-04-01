
-- The security_invoker view needs the underlying table to allow SELECT for the invoking role.
-- Re-add public SELECT policy (the view already strips sensitive columns)
CREATE POLICY "Font dataset public safe readable" ON public.font_dataset
FOR SELECT TO public
USING (sample_image_url NOT LIKE '%/queue/%');
