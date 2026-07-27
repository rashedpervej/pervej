# Supabase-Powered Headless CMS & Dynamic Portfolio Portfolio

This document outlines the detailed architectural blueprint and migration plan to convert the portfolio into a Supabase-powered CMS with a dynamic WordPress-like admin dashboard, serverless functions (Vercel-compatible), dynamic schema-driven page building, and automated analytics/AI FAQ handling.

---

## 1. Architectural Blueprint & Technical Stack

The architecture is designed to be fully decoupled from standard server processes, ensuring scalability, cheap hosting (Vercel serverless), and extreme performance.

```
+-----------------------------------------------------------------+
|                        Frontend App (React 19)                  |
|  +-------------------+  +-------------------+  +---------------+|
|  |   Portfolio UI    |  |  Admin Dashboard  |  |  Chatbot UI   ||
|  +-------------------+  +-------------------+  +---------------+|
+-----------------------------------------------------------------+
            |                       |                     |
            | Read Portfolio        | Authenticate,       | Send Message
            | (Published)           | Edit & Publish      |
            v                       v                     v
+---------------------+   +-------------------+  +----------------+
|  Supabase Database  |   |   Supabase Auth   |  | Serverless API |
|   (PostgreSQL REST) |   | (JWT + Role RBAC) |  |   (/api/chat)  |
+---------------------+   +-------------------+  +----------------+
            ^                       ^                     |
            | Read Files            | Write Files         | Query KB & FAQ
            | (Images / CV)         | (Media Upload)      | / Gemini
            +-----------------------+                     v
                        |                        +----------------+
                        v                        |   Supabase DB  |
              +-------------------+              |  & Gemini AI   |
              |  Supabase Storage |              +----------------+
              | (Bucket: portfolio|                                
              +-------------------+                                
```

### Key Components:
- **Database (Supabase PostgreSQL)**: Holds all content configurations, knowledge base records, analytics, and user roles. Access is secured using Row Level Security (RLS) rules.
- **Authentication (Supabase Auth)**: Authenticates CMS Administrators and Editors using secure JWT tokens.
- **Storage (Supabase Storage)**: Holds portfolio images, branding assets, and the downloadable CV.
- **Serverless API Routes (`/api/*`)**: Simple endpoints for chatbot operations and custom serverless handling, compatible with Vercel and local Express development serverless-bridging.

---

## 2. Supabase Database Schema (DDL)

To handle all sections dynamically and support **Content States (Draft, Preview, Publish)**, **Reusable Dynamic Sections**, and **Analytics**, we will deploy the following database schema:

### 2.1 Table: `user_roles`
Tracks administrative permissions (Admin vs. Editor) based on Supabase Auth.
```sql
create type user_role_type as enum ('admin', 'editor');

create table public.user_roles (
    id uuid references auth.users on delete cascade primary key,
    role user_role_type not null default 'editor',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policies
create policy "Allow public read access to roles" on public.user_roles
    for select using (true);

create policy "Allow admins to manage roles" on public.user_roles
    for all using (
        exists (
            select 1 from public.user_roles 
            where id = auth.uid() and role = 'admin'
        )
    );
```

### 2.2 Table: `sections`
Stores content for all sections (Hero, About, Projects, etc.). It supports **Draft/Preview/Publish** and **Dynamic Field Schemas**.
```sql
create table public.sections (
    id uuid default gen_random_uuid() primary key,
    key text not null unique,                  -- e.g. 'hero', 'about', 'custom_press'
    name text not null,                       -- e.g. 'Hero Section', 'My Custom Press'
    type text not null default 'single',       -- 'single' (object layout) or 'collection' (list of cards/items)
    fields_schema jsonb not null default '[]'::jsonb, -- dynamic fields, e.g. [{name: 'title', type: 'text'}]
    published_content jsonb default null,     -- content visible to public visitors
    draft_content jsonb not null default '{}'::jsonb, -- pending drafts being worked on in admin dashboard
    is_visible boolean not null default true,
    order_index integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.sections enable row level security;

-- Policies
create policy "Allow public to read visible, published sections" on public.sections
    for select using (is_visible = true and published_content is not null);

create policy "Allow logged-in editors and admins to view all" on public.sections
    for select using (auth.role() = 'authenticated');

create policy "Allow logged-in editors and admins to write" on public.sections
    for all using (auth.role() = 'authenticated');
```

### 2.3 Table: `faq_knowledge_base`
Stores pre-defined answers to intercept the chatbot and bypass expensive Gemini API calls.
```sql
create table public.faq_knowledge_base (
    id uuid default gen_random_uuid() primary key,
    question text not null,
    answer text not null,
    keywords text[] not null default '{}',
    category text not null default 'general',
    status text not null default 'published', -- 'draft' or 'published'
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.faq_knowledge_base enable row level security;

create policy "Allow public to read published knowledge base" on public.faq_knowledge_base
    for select using (status = 'published');

create policy "Allow authenticated users full access" on public.faq_knowledge_base
    for all using (auth.role() = 'authenticated');
```

### 2.4 Table: `analytics_events`
Stores visitor interactions for dashboard reporting.
```sql
create table public.analytics_events (
    id uuid default gen_random_uuid() primary key,
    event_type text not null, -- 'page_view', 'contact_click', 'cv_download', 'faq_ask'
    event_details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Public can INSERT analytics events, only logged-in users can SELECT/read them
create policy "Allow anyone to insert analytics" on public.analytics_events
    for insert with check (true);

create policy "Allow authenticated users to read analytics" on public.analytics_events
    for select using (auth.role() = 'authenticated');
```

### 2.5 Table: `site_settings`
Handles global preferences like SEO settings, branding colors, CV storage URL, and custom CSS toggles.
```sql
create table public.site_settings (
    id uuid default gen_random_uuid() primary key,
    key text not null unique,
    value jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "Allow public read access to settings" on public.site_settings
    for select using (true);

create policy "Allow authenticated write access to settings" on public.site_settings
    for all using (auth.role() = 'authenticated');
```

---

## 3. Four Advanced Requirements Design & Execution

### 3.1 Content Versioning: Draft, Preview, and Publish
- **State Partitioning**: The `sections` table contains distinct `published_content` and `draft_content` columns.
- **Save as Draft**: Writes only to `draft_content`.
- **Publish**: Copies `draft_content` into `published_content`.
- **Live Preview System**:
  - The admin dashboard features a "Preview Sandbox" toggle.
  - When enabled, the portfolio layout renders the `draft_content` of all sections instead of `published_content`. This is done instantly on the client using a React Context state (`usePortfolioPreview()`).

### 3.2 Database Backups & JSON Import/Export
- **Manual Backups (Export)**: Admin triggers a backup with one click. The dashboard fetches the full contents of `sections`, `faq_knowledge_base`, and `site_settings` using a single dynamic client-side query, serializes it to a single signed JSON file, and triggers a download.
- **Restorations (Import)**: Admins can upload a previously exported backup JSON file. The dashboard parses, validates the structures, and updates the tables in bulk.

### 3.3 Role-Based Access Control (RBAC)
- **Roles**: `'admin'` (full privileges, including user management, schema editing, and database backups) and `'editor'` (content editing, saving drafts, writing FAQs).
- **Enforcement**:
  - Enforced directly in Supabase RLS policies.
  - Enforced on the client by fetching `/public/user_roles` upon login and routing unauthorized personnel away from administrative sections.

### 3.4 Reusable Dynamic Sections (Schema-driven Builder)
- **Schema-Driven UI**:
  - The system will dynamically map a dynamic section's `fields_schema` JSONB into interactive dashboard edit forms.
  - For example, if a section defines field `{"name": "promo_video", "type": "text"}`, the dashboard automatically shows a text field. If it has type `'image'`, it shows an image-uploader linking directly to Supabase Storage.
- **Dynamic Frontend Assembly**:
  - The portfolio dynamically maps standard keys ('hero', 'about', 'projects') to their bespoke high-fidelity layouts.
  - If a completely *new* custom section is added (e.g., `key: 'custom_press'`), the app renders it using a **Dynamic Section Component** that loops through its fields, styling it beautifully using the portfolio's core layout framework.

---

## 4. Phased Implementation Roadmap

To maintain extreme system stability and prevent breakage, we will execute the migration sequentially:

### 🚀 PHASE 1: Project Setup, Supabase Client & Local Fallback Bridge (Current Focus)
- Install `@supabase/supabase-js`.
- Set up environment variables schema in `.env.example`.
- Create `/src/lib/supabase.ts` initialization client with automatic graceful fallbacks.
- Create `/src/context/PortfolioContext.tsx` providing centralized data streams (both local fallback data and Supabase live data).
- Rewrite portfolio sections to read from this central provider instead of importing `data.ts` directly.

### PHASE 2: Database Setup, Security Policies, and Storage buckets
- Guide user to instantiate database tables and RLS rules in Supabase.
- Configure public storage buckets: `portfolio-assets` for CVs and images.
- Seed database with default portfolio records taken from `data.ts`.

### PHASE 3: Build Serverless FAQ Engine & Chatbot Bridge
- Build `/api/chat.ts` lookup logic: intercepts incoming queries, executes smart text matching over the `faq_knowledge_base`, and falls back to Gemini AI with context injections only when necessary.
- Store anonymous questions in the `analytics_events` table.

### PHASE 4: Build WordPress-like Admin Dashboard UI
- Build a secure `/admin` page using Supabase Auth.
- Create dashboard navigation panels: Section Manager, FAQ Manager, Media Library, Analytics Board, and Backups.
- Implement role checks (Admin vs Editor).

### PHASE 5: Advanced Admin Mechanics
- Implement Draft/Preview/Publish toggles.
- Implement the local Sandbox Preview context for side-by-side editing.
- Build the single-click JSON Backup Export/Import logic.
- Integrate the dynamic schema-driven section adder.

### PHASE 6: Analytics, Final Lint, Compile & Verification
- Integrate analytics triggers across the main site (clicks, views, downloads).
- Add charts and trendlines in the admin panel using `recharts` / `d3`.
- Perform comprehensive lint checks and compile verification to certify zero-downtime deployment.

---

## 5. Phase 1 Execution Checklist

We are ready to begin **Phase 1** immediately:
1. **[Dependencies]**: Install `@supabase/supabase-js` package.
2. **[Environment Configuration]**: Document environment variables inside `.env.example`.
3. **[Supabase Client]**: Create `/src/lib/supabase.ts` with fail-safes.
4. **[Central Portfolio Context Provider]**: Create `/src/context/PortfolioContext.tsx` which streams data, handles Preview/Draft toggles, and resolves static data as a flawless fallback.
5. **[Dynamic Section Hook Binding]**: Adjust `/src/App.tsx` and main sections (`Projects.tsx`, `Hero.tsx`, `About.tsx`, etc.) to consume content from `PortfolioContext`.

Let's begin!
