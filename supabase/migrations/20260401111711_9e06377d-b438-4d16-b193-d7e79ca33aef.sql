
-- 1. Clean up old policies
DROP POLICY IF EXISTS "Block direct insert on security_logs" ON public.security_logs;
DROP POLICY IF EXISTS "Admins manage all security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Admins can read security logs" ON public.security_logs;
DROP POLICY IF EXISTS "no_direct_inserts" ON public.security_logs;

-- 2. Block ALL direct inserts from any role
CREATE POLICY "block_all_direct_inserts"
ON public.security_logs
FOR INSERT
TO public
WITH CHECK (false);

-- 3. Admins can only READ logs, not modify them
CREATE POLICY "admins_read_security_logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Drop old insert_security_log function
DROP FUNCTION IF EXISTS public.insert_security_log(text);

-- 5. Create hardened log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_user_id uuid;
    allowed_actions text[] := ARRAY[
        'login_success', 'login_failed', 'logout', 'signup',
        'password_reset', 'password_change', 'session_start',
        'suspicious_activity', 'rate_limit_hit', 'file_upload',
        'font_identify', 'manual_request'
    ];
BEGIN
    -- Safely capture current user
    v_user_id := auth.uid();

    -- Validate action is not null/empty
    IF p_action IS NULL OR length(trim(p_action)) < 3 THEN
        RAISE EXCEPTION 'Invalid action: too short or null';
    END IF;

    -- Whitelist allowed actions
    IF NOT (trim(p_action) = ANY(allowed_actions)) THEN
        RAISE EXCEPTION 'Invalid action: not in allowed list';
    END IF;

    -- Validate metadata is a JSON object
    IF p_metadata IS NOT NULL AND jsonb_typeof(p_metadata) IS DISTINCT FROM 'object' THEN
        p_metadata := '{}'::jsonb;
    END IF;

    -- Limit metadata size to prevent abuse (max 2KB)
    IF length(p_metadata::text) > 2048 THEN
        p_metadata := '{}'::jsonb;
    END IF;

    -- Insert the log entry
    INSERT INTO public.security_logs (
        user_id,
        action,
        metadata,
        created_at
    )
    VALUES (
        v_user_id,
        trim(p_action),
        COALESCE(p_metadata, '{}'::jsonb),
        now()
    );
END;
$$;

-- 6. Grant execute only to authenticated and anon
GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb) TO anon;

-- 7. Revoke direct table insert from all non-admin roles
REVOKE INSERT ON public.security_logs FROM authenticated;
REVOKE INSERT ON public.security_logs FROM anon;
