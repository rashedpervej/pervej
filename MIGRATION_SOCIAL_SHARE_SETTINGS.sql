-- ========================================================================
-- SQL MIGRATION: GLOBAL SOCIAL SHARE & OPEN GRAPH (OG) SETTINGS
-- ========================================================================
-- Run this script in your Supabase Project SQL Editor (https://supabase.com)
-- to initialize default global Open Graph & Twitter Card social share settings.
-- Extends the existing public.site_settings key-value store.
-- Safe, idempotent, and backward-compatible.
-- ========================================================================

-- Ensure site_settings table exists
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Initialize default social share settings if not already set
INSERT INTO public.site_settings (key, value)
VALUES 
  ('ogTitle', 'Rashed Pervej | Senior Visualizer Portfolio'),
  ('ogDescription', 'Award-winning portfolio of Rashed Pervej, Senior Visualizer & Graphic Designer specializing in brand identity, packaging, and motion graphics.'),
  ('ogImage', 'https://pervej.pro.bd/og-image.jpg'),
  ('ogUrl', 'https://pervej.pro.bd/')
ON CONFLICT (key) DO NOTHING;

-- Verification query
SELECT * FROM public.site_settings WHERE key IN ('ogTitle', 'ogDescription', 'ogImage', 'ogUrl');
