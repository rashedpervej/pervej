-- ==============================================================================
-- MASTER PRE-LAUNCH SUPABASE SECURITY & MULTI-TENANT ISOLATION UPDATE
-- Project: Pervej Portfolio (pervej.pro.bd)
-- Date: 2026-09-28
-- Target: Supabase SQL Editor
--
-- Summary of Fixes:
--   1. Replaces recursive/improper is_admin() with email + role check.
--   2. Secures site_settings: Strictly hides encrypted_ai_vault, aiVault,
--      masterUnifiedKey, smtpPass from anonymous users.
--   3. Secures sections: Public can only view visible sections; only admin can mutate.
--   4. Secures leads & contact submissions: Public can insert leads; only admin can view/manage.
--   5. Secures analytics_events & chatbot_interactions: Public can insert; only admin can read.
--   6. Multi-Tenant Invoice Isolation: Public Invoice Maker remains fully functional,
--      with multi-tenant isolation per user_id / client tenant ID.
--   7. Configures Storage bucket policies for 'cv' and 'portfolio-assets'.
--   8. Auto-assigns admin role to site owner (rashedpervej2011@gmail.com).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER: public.is_admin()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Site owner check via JWT email claim
  IF auth.jwt() ->> 'email' IN ('rashedpervej2011@gmail.com', 'admin@portfolio.com') THEN
    RETURN true;
  END IF;

  -- Role check in user_roles table
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ------------------------------------------------------------------------------
-- 2. USER_ROLES POLICIES & OWNER ASSIGNMENT
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins to manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow public read access to roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role or admin can read all" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;

CREATE POLICY "Users can read own role or admin can read all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Auto-assign admin role to site owner if account exists in auth.users
DO $$
BEGIN
  INSERT INTO public.user_roles (id, role)
  SELECT id, 'admin'
  FROM auth.users
  WHERE email IN ('rashedpervej2011@gmail.com', 'admin@portfolio.com')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;


-- ------------------------------------------------------------------------------
-- 3. SITE_SETTINGS SECURITY (VAULT & SECRET KEY PROTECTION)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing / legacy policies
DROP POLICY IF EXISTS "Allow full access site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated write access to settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow logged-in users to manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public read access to non-sensitive settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can view all settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can modify settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admin full access to site_settings" ON public.site_settings;

-- Public can read site settings EXCLUDING vault, API keys, and sensitive tokens
CREATE POLICY "Public read access to non-sensitive settings"
  ON public.site_settings
  FOR SELECT
  USING (
    key NOT IN (
      'encrypted_ai_vault',
      'aiVault',
      'aiApiKey',
      'geminiApiKey',
      'masterUnifiedKey',
      'smtpSettings',
      'smtpPass'
    )
  );

-- Admins can read all settings (including vault and keys)
CREATE POLICY "Admin read all site_settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Only admins can mutate settings
CREATE POLICY "Admin modify site_settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 4. SECTIONS SECURITY
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access sections" ON public.sections;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to manage sections" ON public.sections;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to view all" ON public.sections;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to write" ON public.sections;
DROP POLICY IF EXISTS "Allow public read sections" ON public.sections;
DROP POLICY IF EXISTS "Allow public to read visible, published sections" ON public.sections;
DROP POLICY IF EXISTS "Public can view visible published sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can view all sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can modify sections" ON public.sections;
DROP POLICY IF EXISTS "Admin modify sections" ON public.sections;

-- Public visitors can only view visible published sections
CREATE POLICY "Public can view visible published sections"
  ON public.sections
  FOR SELECT
  USING (is_visible = true);

-- Admins can view all sections (drafts, hidden, archive)
CREATE POLICY "Admin view all sections"
  ON public.sections
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Only admins can insert, update, or delete sections
CREATE POLICY "Admin modify sections"
  ON public.sections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 5. LEADS & CONTACT SUBMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  visitor_ip TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated all leads" ON public.leads;
DROP POLICY IF EXISTS "Public insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admin manage leads" ON public.leads;

-- Anyone can submit a lead / contact form inquiry
CREATE POLICY "Public insert leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read, update, or delete leads
CREATE POLICY "Admin manage leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 6. ANALYTICS_EVENTS & CHATBOT_INTERACTIONS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public insert" ON public.analytics_events;
DROP POLICY IF EXISTS "Public can insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Admin manage analytics" ON public.analytics_events;

CREATE POLICY "Public can insert analytics"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin manage analytics"
  ON public.analytics_events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Chatbot interactions
CREATE TABLE IF NOT EXISTS public.chatbot_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  source TEXT,
  visitor_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert interactions" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Admin manage interactions" ON public.chatbot_interactions;

CREATE POLICY "Public can insert interactions"
  ON public.chatbot_interactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin manage interactions"
  ON public.chatbot_interactions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 7. FAQ KNOWLEDGE BASE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faq_knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.faq_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read faqs" ON public.faq_knowledge_base;
DROP POLICY IF EXISTS "Admin manage faqs" ON public.faq_knowledge_base;

CREATE POLICY "Public can read faqs"
  ON public.faq_knowledge_base
  FOR SELECT
  USING (true);

CREATE POLICY "Admin manage faqs"
  ON public.faq_knowledge_base
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- 8. INVOICE MAKER (PUBLIC MULTI-TENANT ISOLATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inv_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  client_email TEXT,
  total NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  date TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adjust unique constraint to composite (inv_number, user_id) so each user has independent invoice numbers
DO $$
BEGIN
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_inv_number_key;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_inv_key'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_user_inv_key UNIQUE (inv_number, user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow public all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Invoices tenant isolation" ON public.invoices;
DROP POLICY IF EXISTS "Admin manage all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users manage own invoices" ON public.invoices;

-- Admin has full access to all invoices
CREATE POLICY "Admin manage all invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated users can manage their own invoices (isolated by user_id)
CREATE POLICY "Authenticated users manage own invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anonymous users manage own invoices" ON public.invoices;


-- ------------------------------------------------------------------------------
-- 9. STORAGE BUCKET POLICIES ('cv' & 'portfolio-assets')
-- ------------------------------------------------------------------------------
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('portfolio-assets', 'portfolio-assets', true),
  ('cv', 'cv', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Clean existing bucket policies
DROP POLICY IF EXISTS "Public can view portfolio assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view cv" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage portfolio assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage cv" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read portfolio-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read cv" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload portfolio-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload cv" ON storage.objects;

-- Public can view files in public buckets
CREATE POLICY "Public read portfolio assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('portfolio-assets', 'cv'));

-- Only admins can upload, update, or delete files
CREATE POLICY "Admin manage portfolio assets"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id IN ('portfolio-assets', 'cv') AND public.is_admin())
  WITH CHECK (bucket_id IN ('portfolio-assets', 'cv') AND public.is_admin());
