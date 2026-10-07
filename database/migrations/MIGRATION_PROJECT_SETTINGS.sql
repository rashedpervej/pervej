-- ========================================================================
-- SQL MIGRATION: GLOBAL PROJECT METADATA VISIBILITY SETTINGS
-- ========================================================================
-- Run this script in your Supabase Project SQL Editor (https://supabase.com)
-- to initialize the default global project metadata visibility settings.
-- ========================================================================

-- Initialize default project visibility settings in site_settings
INSERT INTO public.site_settings (key, value)
VALUES (
  'projectSettings',
  '{
    "showCategory": true,
    "showYear": true,
    "showAwardBadge": true,
    "showClientName": true,
    "showServices": true,
    "showToolsUsed": true,
    "showProjectDuration": true,
    "showLiveUrl": true,
    "showBehanceUrl": true,
    "showCaseStudyButton": true,
    "showProjectTags": true
  }'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Enable RLS and verify public read is enabled for site_settings
-- (This table and rules already exist in the database, this is for reference)
-- ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read access to settings" ON public.site_settings FOR SELECT USING (true);
-- CREATE POLICY "Allow authenticated write access to settings" ON public.site_settings FOR ALL USING (auth.role() = 'authenticated');
