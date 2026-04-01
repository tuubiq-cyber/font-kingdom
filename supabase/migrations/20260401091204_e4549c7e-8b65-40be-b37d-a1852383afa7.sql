
-- Add user_id column to font_dataset
ALTER TABLE public.font_dataset ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Authenticated users insert font_dataset" ON public.font_dataset;

-- New INSERT policy with ownership binding
CREATE POLICY "Authenticated users insert own font_dataset" ON public.font_dataset
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND verified_by_admin = false
  AND admin_metadata = '{}'::jsonb
);
