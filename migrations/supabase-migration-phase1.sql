-- Phase 1: Product Context + SEO Brief + Email Sequence
-- Includes prerequisite table creation (brand_guide, content_projects)

-- =============================================
-- 0. 선행 테이블 (없으면 생성)
-- =============================================

-- brand_guide
CREATE TABLE IF NOT EXISTS brand_guide (
  id text PRIMARY KEY DEFAULT 'default',
  brand_name text NOT NULL DEFAULT '',
  brand_description text DEFAULT '',
  target_audience text DEFAULT '',
  tone text DEFAULT 'professional' CHECK (tone IN ('formal', 'casual', 'friendly', 'playful', 'professional')),
  keywords text[] DEFAULT '{}',
  avoid_keywords text[] DEFAULT '{}',
  website_url text DEFAULT '',
  additional_notes text DEFAULT '',
  user_id text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE brand_guide ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_guide' AND policyname = 'Allow all on brand_guide') THEN
    CREATE POLICY "Allow all on brand_guide" ON brand_guide FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
INSERT INTO brand_guide (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- content_projects (needed for seo_briefs FK)
CREATE TABLE IF NOT EXISTS content_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL DEFAULT '',
  platforms text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'idea_proposed',
  ideas jsonb DEFAULT '[]',
  selected_idea_index integer,
  materials jsonb DEFAULT '[]',
  selected_image_index integer,
  drafts jsonb DEFAULT '{}',
  banner_id uuid,
  banner_html text,
  ai_explanation text,
  user_notes text DEFAULT '',
  user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_projects' AND policyname = 'Allow all on content_projects') THEN
    CREATE POLICY "Allow all on content_projects" ON content_projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =============================================
-- 1. brand_guide 확장 (8개 Product Context 필드)
-- =============================================
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS product_type text DEFAULT '';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS industry text DEFAULT '';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS competitors text[] DEFAULT '{}';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS usp text DEFAULT '';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS pricing_model text DEFAULT '';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS customer_pain_points text[] DEFAULT '{}';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS key_features text[] DEFAULT '{}';
ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS company_size text DEFAULT '';

-- =============================================
-- 2. seo_briefs
-- =============================================
CREATE TABLE IF NOT EXISTS seo_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  primary_keyword text NOT NULL DEFAULT '',
  secondary_keywords text[] DEFAULT '{}',
  search_intent text DEFAULT '',
  title_tags jsonb DEFAULT '[]',
  meta_descriptions jsonb DEFAULT '[]',
  content_outline jsonb DEFAULT '[]',
  internal_link_suggestions jsonb DEFAULT '[]',
  competitor_notes text DEFAULT '',
  word_count_estimate integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','completed','sent_to_compose')),
  sent_to_project_id uuid REFERENCES content_projects(id),
  user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE seo_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on seo_briefs" ON seo_briefs FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 3. email_sequences
-- =============================================
CREATE TABLE IF NOT EXISTS email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  purpose text NOT NULL DEFAULT 'welcome'
    CHECK (purpose IN ('welcome','onboarding','promotion','re-engagement','product_launch')),
  target_audience text DEFAULT '',
  key_messages text[] DEFAULT '{}',
  strategy_explanation text DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generating','completed','active')),
  email_count integer DEFAULT 3,
  user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_sequences" ON email_sequences FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 4. email_sequence_items
-- =============================================
CREATE TABLE IF NOT EXISTS email_sequence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  day_offset integer NOT NULL DEFAULT 0,
  subject text NOT NULL DEFAULT '',
  body_html text DEFAULT '',
  cta_text text DEFAULT '',
  cta_url text DEFAULT '',
  notes text DEFAULT '',
  gmail_draft_id text,
  gmail_message_id text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','edited','gmail_saved')),
  user_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE email_sequence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_sequence_items" ON email_sequence_items FOR ALL USING (true) WITH CHECK (true);
