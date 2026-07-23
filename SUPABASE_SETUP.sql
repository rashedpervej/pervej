-- ========================================================================
-- SUPABASE DATABASE CONFIGURATION & RLS POLICY SETUP
-- ========================================================================
-- Run this script in your Supabase Project SQL Editor (https://supabase.com)
-- to resolve all Row-Level Security (RLS) insertion and query violations.
-- This allows anonymous visitors to log chatbot interactions and analytics
-- while keeping them private, and allows authenticated admins to view, update,
-- and delete logs on the admin dashboard.
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. POLICIES FOR "chatbot_interactions" TABLE
-- ------------------------------------------------------------------------

-- Ensure RLS is active on the table
ALTER TABLE public.chatbot_interactions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on chatbot_interactions to prevent duplicates
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.chatbot_interactions;

-- Policy A: Allow both anonymous website visitors and authenticated users to insert new chat logs
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.chatbot_interactions;
DROP POLICY IF EXISTS "Allow public inserts" ON public.chatbot_interactions;
CREATE POLICY "Allow public inserts" ON public.chatbot_interactions
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

-- Policy B: Only authenticated admins can SELECT (read) conversation logs
CREATE POLICY "Allow authenticated select" ON public.chatbot_interactions
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy C: Only authenticated admins can UPDATE conversation logs
CREATE POLICY "Allow authenticated update" ON public.chatbot_interactions
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy D: Only authenticated admins can DELETE conversation logs
CREATE POLICY "Allow authenticated delete" ON public.chatbot_interactions
  FOR DELETE 
  TO authenticated 
  USING (true);


-- ------------------------------------------------------------------------
-- 2. POLICIES FOR "analytics_events" TABLE
-- ------------------------------------------------------------------------

-- Ensure RLS is active on the table
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on analytics_events to prevent duplicates
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.analytics_events;

-- Policy A: Allow both anonymous website visitors and authenticated users to insert general analytics events
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public inserts" ON public.analytics_events;
CREATE POLICY "Allow public inserts" ON public.analytics_events
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

-- Policy B: Only authenticated admins can SELECT (read) analytics events
CREATE POLICY "Allow authenticated select" ON public.analytics_events
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy C: Only authenticated admins can UPDATE analytics events
CREATE POLICY "Allow authenticated update" ON public.analytics_events
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy D: Only authenticated admins can DELETE analytics events
CREATE POLICY "Allow authenticated delete" ON public.analytics_events
  FOR DELETE 
  TO authenticated 
  USING (true);


-- ------------------------------------------------------------------------
-- 3. POLICIES & SCHEMA FOR "leads" TABLE (LEAD MANAGEMENT)
-- ------------------------------------------------------------------------

-- Create the table if it does not exist
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' NOT NULL, -- 'new', 'read', 'replied', 'archived'
  notes TEXT DEFAULT '',
  visitor_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS is active on the table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on leads to prevent duplicates
DROP POLICY IF EXISTS "Allow public inserts" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.leads;

-- Policy A: Allow both anonymous website visitors and authenticated users to insert new leads
CREATE POLICY "Allow public inserts" ON public.leads
  FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

-- Policy B: Only authenticated admins can SELECT (read) leads
CREATE POLICY "Allow authenticated select" ON public.leads
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy C: Only authenticated admins can UPDATE leads
CREATE POLICY "Allow authenticated update" ON public.leads
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Policy D: Only authenticated admins can DELETE leads
CREATE POLICY "Allow authenticated delete" ON public.leads
  FOR DELETE 
  TO authenticated 
  USING (true);


-- ========================================================================
-- SANITY CHECK: HOW TO VERIFY IN SUPABASE
-- ========================================================================
-- 1. Anonymous website visitors can INSERT records but CANNOT SELECT them.
--    This keeps user inputs and responses safe and secure.
-- 2. Your logged-in Admin session (authenticated role) has full read, 
--    update, and delete permissions to manage and audit the dashboard.
-- ========================================================================


-- ------------------------------------------------------------------------
-- 5. SUPABASE STORAGE BUCKET & RLS POLICIES FOR "cv" (CV MANAGEMENT)
-- ------------------------------------------------------------------------

-- Create 'cv' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv', 'cv', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for 'cv' bucket
-- Policy A: Allow public read access to CV files
DROP POLICY IF EXISTS "Public Read Access for CV Bucket" ON storage.objects;
CREATE POLICY "Public Read Access for CV Bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cv');

-- Policy B: Allow public/anon and authenticated users to upload CV files
DROP POLICY IF EXISTS "Public Upload Access for CV Bucket" ON storage.objects;
CREATE POLICY "Public Upload Access for CV Bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'cv');

-- Policy C: Allow authenticated users to update CV files
DROP POLICY IF EXISTS "Authenticated Update Access for CV Bucket" ON storage.objects;
CREATE POLICY "Authenticated Update Access for CV Bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cv');

-- Policy D: Allow authenticated users to delete CV files
DROP POLICY IF EXISTS "Authenticated Delete Access for CV Bucket" ON storage.objects;
CREATE POLICY "Authenticated Delete Access for CV Bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cv');

