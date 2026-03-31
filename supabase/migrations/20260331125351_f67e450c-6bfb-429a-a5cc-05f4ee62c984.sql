
-- 1. Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. RLS on user_roles: admins can manage, users can read own
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Fix font_dataset RLS: public read, admin-only write
DROP POLICY IF EXISTS "Authenticated users manage font_dataset" ON public.font_dataset;
DROP POLICY IF EXISTS "Font dataset publicly readable" ON public.font_dataset;

CREATE POLICY "Font dataset publicly readable" ON public.font_dataset
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage font_dataset" ON public.font_dataset
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Fix manual_identification_queue RLS
DROP POLICY IF EXISTS "Anyone can insert to queue" ON public.manual_identification_queue;
DROP POLICY IF EXISTS "Authenticated users manage queue" ON public.manual_identification_queue;
DROP POLICY IF EXISTS "Queue publicly readable" ON public.manual_identification_queue;

-- Anyone (including anon) can insert
CREATE POLICY "Anyone can insert to queue" ON public.manual_identification_queue
  FOR INSERT TO public
  WITH CHECK (true);

-- Users can read their own requests
CREATE POLICY "Users read own queue items" ON public.manual_identification_queue
  FOR SELECT TO public
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Admins can read all and update
CREATE POLICY "Admins manage all queue items" ON public.manual_identification_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Fix fonts_library: public read, admin write
DROP POLICY IF EXISTS "Authenticated users manage fonts_library" ON public.fonts_library;
DROP POLICY IF EXISTS "Fonts library publicly readable" ON public.fonts_library;

CREATE POLICY "Fonts library publicly readable" ON public.fonts_library
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage fonts_library" ON public.fonts_library
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Fix font_files: public read, admin write
DROP POLICY IF EXISTS "Authenticated users manage font_files" ON public.font_files;
DROP POLICY IF EXISTS "Font files publicly readable" ON public.font_files;

CREATE POLICY "Font files publicly readable" ON public.font_files
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage font_files" ON public.font_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Fix fonts table: public read, admin write
DROP POLICY IF EXISTS "Allow all font management" ON public.fonts;
DROP POLICY IF EXISTS "Fonts are publicly readable" ON public.fonts;

CREATE POLICY "Fonts publicly readable" ON public.fonts
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage fonts" ON public.fonts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Create check_admin edge function helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;
