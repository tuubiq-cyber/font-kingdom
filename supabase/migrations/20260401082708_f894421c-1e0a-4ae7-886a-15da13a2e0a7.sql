
-- Ensure no UPDATE/DELETE on daily_usage for non-admins
DROP POLICY IF EXISTS "Users delete own usage" ON public.daily_usage;

-- Ensure security_logs INSERT is restricted to authenticated users with matching user_id
-- (already exists, but let's make sure no anon policy remains)
DROP POLICY IF EXISTS "Anon can insert logs" ON public.security_logs;
DROP POLICY IF EXISTS "Anyone can insert security logs" ON public.security_logs;
