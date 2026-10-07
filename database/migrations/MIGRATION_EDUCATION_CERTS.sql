-- ========================================================================
-- SQL MIGRATION: SEED EDUCATION & CERTIFICATIONS IN SECTIONS TABLE
-- ========================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- to pre-seed the Education & Certifications collection section.
--
-- NOTE:
-- Even without running this script, saving or clicking "Publish Live" 
-- inside the Admin Dashboard for "Education & Certs" will automatically 
-- upsert this record into your database!
-- ========================================================================

INSERT INTO public.sections (
  key,
  name,
  type,
  fields_schema,
  published_content,
  draft_content,
  is_visible,
  order_index
)
VALUES (
  'educationCertifications',
  'Education & Certifications',
  'collection',
  '[
    {"name": "title", "type": "text"},
    {"name": "institution", "type": "text"},
    {"name": "period", "type": "text"},
    {"name": "credentialUrl", "type": "text"}
  ]'::jsonb,
  '[
    {
      "title": "BSS in Economics",
      "institution": "National University, Bangladesh",
      "period": "2013 – 2017",
      "credentialUrl": ""
    },
    {
      "title": "Foundations of User Experience (UX) Design",
      "institution": "Coursera | Google",
      "period": "2023",
      "credentialUrl": ""
    },
    {
      "title": "Color for Design and Art",
      "institution": "Coursera | California Institute of the Arts",
      "period": "2022",
      "credentialUrl": ""
    },
    {
      "title": "Digital Marketing Certification",
      "institution": "LEDP, Government of Bangladesh",
      "period": "2020",
      "credentialUrl": ""
    }
  ]'::jsonb,
  '[
    {
      "title": "BSS in Economics",
      "institution": "National University, Bangladesh",
      "period": "2013 – 2017",
      "credentialUrl": ""
    },
    {
      "title": "Foundations of User Experience (UX) Design",
      "institution": "Coursera | Google",
      "period": "2023",
      "credentialUrl": ""
    },
    {
      "title": "Color for Design and Art",
      "institution": "Coursera | California Institute of the Arts",
      "period": "2022",
      "credentialUrl": ""
    },
    {
      "title": "Digital Marketing Certification",
      "institution": "LEDP, Government of Bangladesh",
      "period": "2020",
      "credentialUrl": ""
    }
  ]'::jsonb,
  true,
  2
)
ON CONFLICT (key) 
DO UPDATE SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  fields_schema = EXCLUDED.fields_schema,
  published_content = COALESCE(public.sections.published_content, EXCLUDED.published_content),
  draft_content = COALESCE(public.sections.draft_content, EXCLUDED.draft_content),
  is_visible = EXCLUDED.is_visible,
  updated_at = NOW();
