-- Custom RSS feeds table
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS custom_rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'marketing',
  user_id text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(url, user_id)
);

ALTER TABLE custom_rss_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on custom_rss_feeds" ON custom_rss_feeds;
CREATE POLICY "Allow all on custom_rss_feeds"
  ON custom_rss_feeds FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS custom_rss_feeds_user_idx ON custom_rss_feeds(user_id);
