-- ==============================================================================
-- MASTER SUPABASE SECURITY & CONSISTENCY FIX SCRIPT
-- Project: Pervej Portfolio v2
-- Purpose:
--   1. Fix infinite recursion in public.user_roles RLS policy
--   2. Drop dangerous "Allow full access ... USING (true)" policies
--   3. Protect sensitive AI keys (aiVault, aiApiKey) in public.site_settings
--   4. Secure public.sections, invoices, leads, analytics_events, chatbot_interactions
--   5. Create & configure 'cv' and 'portfolio-assets' public storage buckets with RLS
--   6. Auto-assign admin role to the site owner
-- ==============================================================================

-- 1. FIX USER_ROLES INFINITE RECURSION VIA SECURITY DEFINER FUNCTION
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean existing user_roles policies
DROP POLICY IF EXISTS "Allow admins to manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow public read access to roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role or admin can read all" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own initial role" ON public.user_roles;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can insert own initial role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());


-- 2. SECURE PUBLIC.SECTIONS
-- ------------------------------------------------------------------
-- Drop all existing conflicting / insecure policies
DROP POLICY IF EXISTS "Allow full access sections" ON public.sections;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to manage sections" ON public.sections;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to view all" ON public.sections;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to write" ON public.sections;
DROP POLICY IF EXISTS "Allow public read sections" ON public.sections;
DROP POLICY IF EXISTS "Allow public to read visible, published sections" ON public.sections;
DROP POLICY IF EXISTS "Public can view visible published sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can view all sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can modify sections" ON public.sections;

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Anonymous public visitors can only read visible published sections
CREATE POLICY "Public can view visible published sections"
  ON public.sections
  FOR SELECT
  USING (is_visible = true AND published_content IS NOT NULL);

-- Authenticated admins/editors can view all sections (including drafts and hidden)
CREATE POLICY "Authenticated users can view all sections"
  ON public.sections
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert, update, or delete sections
CREATE POLICY "Authenticated users can modify sections"
  ON public.sections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 3. SECURE PUBLIC.SITE_SETTINGS (PROTECT AI KEYS & PREVENT DEFACEMENT)
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow full access site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated write access to settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow logged-in users to manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public read access to non-sensitive settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can view all settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can modify settings" ON public.site_settings;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors can read site settings EXCLUDING private API keys
CREATE POLICY "Public read access to non-sensitive settings"
  ON public.site_settings
  FOR SELECT
  USING (
    key NOT IN ('aiVault', 'aiApiKey', 'geminiApiKey', 'masterUnifiedKey', 'smtpSettings')
    OR auth.role() = 'authenticated'
  );

-- Authenticated admins can view all settings (including AI keys)
CREATE POLICY "Authenticated users can view all settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can modify site settings
CREATE POLICY "Authenticated users can modify settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 4. SECURE INVOICES
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 5. CLEAN UP ANALYTICS_EVENTS
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anyone to insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated users to read analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow logged-in users to read analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public insert" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public inserts" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public to insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Public can insert analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Authenticated users can view analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Authenticated users can delete analytics" ON public.analytics_events;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert analytics"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view analytics"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete analytics"
  ON public.analytics_events
  FOR DELETE
  TO authenticated
  USING (true);


-- 6. CLEAN UP LEADS TABLE
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert" ON public.leads;
DROP POLICY IF EXISTS "Allow public inserts" ON public.leads;
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can manage leads" ON public.leads;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 7. CLEAN UP CHATBOT_INTERACTIONS
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow authenticated reads" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow public anonymous inserts" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow public inserts" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Public can insert chat interactions" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Authenticated users can manage chat interactions" ON public.chatbot_interactions;

ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert chat interactions"
  ON public.chatbot_interactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage chat interactions"
  ON public.chatbot_interactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 8. CLEAN UP FAQ_KNOWLEDGE_BASE
-- ------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.faq_knowledge_base;
DROP POLICY IF EXISTS "Allow logged-in editors and admins to manage FAQs" ON public.faq_knowledge_base;
DROP POLICY IF EXISTS "Allow public to read published FAQs" ON public.faq_knowledge_base;
DROP POLICY IF EXISTS "Allow public to read published knowledge base" ON public.faq_knowledge_base;
DROP POLICY IF EXISTS "Public can read published FAQs" ON public.faq_knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can manage FAQs" ON public.faq_knowledge_base;

ALTER TABLE public.faq_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published FAQs"
  ON public.faq_knowledge_base
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users can manage FAQs"
  ON public.faq_knowledge_base
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 9. CREATE STORAGE BUCKETS AND CONFIGURE POLICIES
-- ------------------------------------------------------------------
-- Provision 'cv' and 'portfolio-assets' public buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('cv', 'cv', true, 10485760, ARRAY['application/pdf']),
  ('portfolio-assets', 'portfolio-assets', true, 15728640, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Clean existing storage policies
DROP POLICY IF EXISTS "Public Read All Storage Objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Storage Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Storage Delete" ON storage.objects;

-- Allow anyone to read files from public buckets
CREATE POLICY "Public Read All Storage Objects"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('cv', 'portfolio-assets'));

-- Only authenticated users can upload files
CREATE POLICY "Authenticated Users Storage Upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('cv', 'portfolio-assets'));

-- Only authenticated users can update files
CREATE POLICY "Authenticated Users Storage Update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('cv', 'portfolio-assets'));

-- Only authenticated users can delete files
CREATE POLICY "Authenticated Users Storage Delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('cv', 'portfolio-assets'));


-- 10. ENSURE OWNER EMAIL HAS ADMIN ROLE
-- ------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'rashedpervej2011@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  END IF;
END $$;
