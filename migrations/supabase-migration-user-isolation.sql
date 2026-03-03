-- ============================================================
-- Migration: Add user_id (email) to all data tables
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
BEGIN
  -- Core tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
    ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations') THEN
    ALTER TABLE automations ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_calendar') THEN
    ALTER TABLE content_calendar ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_drafts') THEN
    ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
    ALTER TABLE insights ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Tokens
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_tokens') THEN
    ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Social
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instagram_posts') THEN
    ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'threads_posts') THEN
    ALTER TABLE threads_posts ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Trends
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_trends') THEN
    ALTER TABLE keyword_trends ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_summaries') THEN
    ALTER TABLE trend_summaries ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_articles') THEN
    ALTER TABLE trend_articles ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Competitors
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitors') THEN
    ALTER TABLE competitors ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Banners & Figma
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banners') THEN
    ALTER TABLE banners ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'figma_tokens') THEN
    ALTER TABLE figma_tokens ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'figma_extractions') THEN
    ALTER TABLE figma_extractions ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Brand Guide
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brand_guide') THEN
    ALTER TABLE brand_guide ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Content Projects
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_projects') THEN
    ALTER TABLE content_projects ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Ad Creative Projects
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_creative_projects') THEN
    ALTER TABLE ad_creative_projects ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Agents & Logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reports') THEN
    ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Meta Ads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ad_campaigns') THEN
    ALTER TABLE meta_ad_campaigns ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ad_insights') THEN
    ALTER TABLE meta_ad_insights ADD COLUMN IF NOT EXISTS user_id text;
  END IF;

  -- Agent Tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_tasks') THEN
    ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS user_id text;
  END IF;
END $$;

-- ============================================================
-- Create indexes (safe - check table exists first)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights') THEN
    CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_calendar') THEN
    CREATE INDEX IF NOT EXISTS idx_content_calendar_user ON content_calendar(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitors') THEN
    CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitors(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'banners') THEN
    CREATE INDEX IF NOT EXISTS idx_banners_user ON banners(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_projects') THEN
    CREATE INDEX IF NOT EXISTS idx_content_projects_user ON content_projects(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_articles') THEN
    CREATE INDEX IF NOT EXISTS idx_trend_articles_user ON trend_articles(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_trends') THEN
    CREATE INDEX IF NOT EXISTS idx_keyword_trends_user ON keyword_trends(user_id);
  END IF;
END $$;

-- ============================================================
-- Update unique constraints to be per-user
-- ============================================================
DO $$
BEGIN
  -- insights: url -> (url, user_id)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'insights_url_idx') THEN
    DROP INDEX insights_url_idx;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'insights_url_user_idx') THEN
    CREATE UNIQUE INDEX insights_url_user_idx ON insights(url, user_id);
  END IF;

  -- trend_articles: link -> (link, user_id)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'trend_articles_link_idx') THEN
    DROP INDEX trend_articles_link_idx;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'trend_articles_link_user_idx') THEN
    CREATE UNIQUE INDEX trend_articles_link_user_idx ON trend_articles(link, COALESCE(user_id, ''));
  END IF;

  -- keyword_trends: (keyword, date, source) -> (keyword, date, source, user_id)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'keyword_trends_keyword_date_source_idx') THEN
    DROP INDEX keyword_trends_keyword_date_source_idx;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'keyword_trends_keyword_date_source_user_idx') THEN
    CREATE UNIQUE INDEX keyword_trends_keyword_date_source_user_idx
      ON keyword_trends(keyword, snapshot_date, source, COALESCE(user_id, ''));
  END IF;
END $$;
