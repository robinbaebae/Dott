-- =============================================
-- Meta Ads Integration - Database Migration
-- =============================================

-- Create instagram_tokens if not exists (prerequisite)
CREATE TABLE IF NOT EXISTS instagram_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  access_token text NOT NULL,
  user_id text NOT NULL DEFAULT '',
  token_type text NOT NULL DEFAULT 'long_lived',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE instagram_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on instagram_tokens" ON instagram_tokens;
CREATE POLICY "Allow all on instagram_tokens" ON instagram_tokens FOR ALL USING (true) WITH CHECK (true);

-- Create instagram_posts if not exists (prerequisite)
CREATE TABLE IF NOT EXISTS instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_id text NOT NULL,
  caption text DEFAULT '',
  media_type text NOT NULL DEFAULT 'IMAGE',
  media_url text DEFAULT '',
  permalink text DEFAULT '',
  timestamp timestamptz,
  like_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  saved integer DEFAULT 0,
  engagement integer DEFAULT 0,
  fetched_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS instagram_posts_ig_id_idx ON instagram_posts(ig_id);
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on instagram_posts" ON instagram_posts;
CREATE POLICY "Allow all on instagram_posts" ON instagram_posts FOR ALL USING (true) WITH CHECK (true);

-- Add ad_account_id to instagram_tokens
ALTER TABLE instagram_tokens ADD COLUMN IF NOT EXISTS ad_account_id text;

-- Meta Ad Campaigns (cached from Graph API)
CREATE TABLE IF NOT EXISTS meta_ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  objective text,
  daily_budget bigint,
  lifetime_budget bigint,
  created_time timestamptz,
  updated_time timestamptz,
  fetched_at timestamptz DEFAULT now()
);
ALTER TABLE meta_ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on meta_ad_campaigns" ON meta_ad_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Meta Ad Insights (time-series, cached from Graph API)
CREATE TABLE IF NOT EXISTS meta_ad_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text,
  date_start date NOT NULL,
  date_stop date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric(8,4) DEFAULT 0,
  cpc numeric(12,2) DEFAULT 0,
  cpm numeric(12,2) DEFAULT 0,
  spend numeric(14,2) DEFAULT 0,
  conversions bigint DEFAULT 0,
  cost_per_action_type jsonb DEFAULT '[]',
  actions jsonb DEFAULT '[]',
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, date_start, date_stop)
);
ALTER TABLE meta_ad_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on meta_ad_insights" ON meta_ad_insights FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_meta_ad_insights_date ON meta_ad_insights(date_start, date_stop);
CREATE INDEX IF NOT EXISTS idx_meta_ad_insights_campaign ON meta_ad_insights(campaign_id);
