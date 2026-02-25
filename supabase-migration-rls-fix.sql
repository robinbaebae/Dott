-- ============================================================
-- RLS Policy Hardening Migration
-- Drop permissive "Allow all" policies and replace with:
--   - DENY ALL for data tables (API routes use service_role key)
--   - SELECT ONLY for public-read tables (trend_articles)
--
-- Uses DO blocks so missing tables are safely skipped.
-- ============================================================

-- Create missing tables first (threads support)
CREATE TABLE IF NOT EXISTS threads_tokens (
  id text PRIMARY KEY,
  user_id text,
  access_token text,
  threads_user_id text,
  username text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE threads_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS threads_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threads_id text UNIQUE,
  user_id text,
  text text,
  media_type text,
  media_url text,
  permalink text,
  "timestamp" timestamptz,
  likes integer DEFAULT 0,
  replies integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE threads_posts ENABLE ROW LEVEL SECURITY;

-- Helper: safely apply DENY ALL policy to a table
CREATE OR REPLACE FUNCTION _apply_deny_policy(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "Allow all on %1$s" ON %1$I', tbl);
  EXECUTE format('DROP POLICY IF EXISTS "Deny direct access" ON %1$I', tbl);
  EXECUTE format('CREATE POLICY "Deny direct access" ON %1$I FOR ALL USING (false)', tbl);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table % does not exist, skipping', tbl;
END;
$$ LANGUAGE plpgsql;

-- Apply DENY ALL to all data tables
DO $$
DECLARE
  tables text[] := ARRAY[
    'tasks',
    'chat_sessions',
    'chat_messages',
    'automations',
    'content_calendar',
    'email_drafts',
    'insights',
    'google_tokens',
    'instagram_tokens',
    'instagram_posts',
    'threads_tokens',
    'threads_posts',
    'figma_tokens',
    'figma_extractions',
    'banners',
    'brand_guide',
    'content_projects',
    'ad_creative_projects',
    'seo_briefs',
    'email_sequences',
    'email_sequence_items',
    'agents',
    'agent_tasks',
    'activity_logs',
    'daily_reports',
    'meta_ad_campaigns',
    'meta_ad_insights',
    'competitors',
    'competitor_briefings',
    'competitor_ads',
    'keyword_watchlist',
    'keyword_trends',
    'trend_summaries',
    'token_usage',
    'content_materials'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    PERFORM _apply_deny_policy(tbl);
  END LOOP;
END $$;

-- Clean up helper function
DROP FUNCTION _apply_deny_policy(text);

-- trend_articles: public read, deny write
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all on trend_articles" ON trend_articles;
  DROP POLICY IF EXISTS "Allow read" ON trend_articles;
  DROP POLICY IF EXISTS "Deny write" ON trend_articles;
  DROP POLICY IF EXISTS "Deny update" ON trend_articles;
  DROP POLICY IF EXISTS "Deny delete" ON trend_articles;
  DROP POLICY IF EXISTS "Deny direct access" ON trend_articles;
  CREATE POLICY "Allow read" ON trend_articles FOR SELECT USING (true);
  CREATE POLICY "Deny write" ON trend_articles FOR INSERT WITH CHECK (false);
  CREATE POLICY "Deny update" ON trend_articles FOR UPDATE USING (false);
  CREATE POLICY "Deny delete" ON trend_articles FOR DELETE USING (false);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table trend_articles does not exist, skipping';
END $$;
