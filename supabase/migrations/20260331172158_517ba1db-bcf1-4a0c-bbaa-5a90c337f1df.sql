
-- إنشاء جدول سجلات الأمان
CREATE TABLE public.security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- المشرفون فقط يمكنهم قراءة السجلات
CREATE POLICY "Admins can read security logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- المستخدمون المسجلون يمكنهم إدراج سجلاتهم فقط
CREATE POLICY "Authenticated users can insert own logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- السماح للمستخدمين المجهولين بإدراج سجلات (محاولات تسجيل دخول فاشلة)
CREATE POLICY "Anon can insert logs"
ON public.security_logs
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- المشرفون يديرون جميع السجلات
CREATE POLICY "Admins manage all security logs"
ON public.security_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
