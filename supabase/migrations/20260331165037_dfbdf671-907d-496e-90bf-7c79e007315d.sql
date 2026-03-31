CREATE TABLE public.daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_type text NOT NULL,
  used_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_usage_user_service_date ON public.daily_usage(user_id, service_type, used_at);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage"
ON public.daily_usage FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own usage"
ON public.daily_usage FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage daily_usage"
ON public.daily_usage FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.check_daily_limit(
  _user_id uuid,
  _service_type text,
  _limit int DEFAULT 5
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(*)
    FROM public.daily_usage
    WHERE user_id = _user_id
      AND service_type = _service_type
      AND used_at = CURRENT_DATE
  ) < _limit;
$$;