
-- Drop the insecure SELECT policy
DROP POLICY IF EXISTS "Users read own queue items" ON public.manual_identification_queue;

-- Create a secure policy: authenticated users see only their own items
CREATE POLICY "Authenticated users read own queue items"
ON public.manual_identification_queue
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
