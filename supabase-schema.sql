-- Butter DB Schema for Supabase

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date date,
  urgent boolean DEFAULT false,
  important boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '새 대화',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('content_generation', 'ad_report', 'brand_copy')),
  prompt_template text NOT NULL,
  last_result text,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE trend_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link text NOT NULL,
  source text,
  category text DEFAULT 'marketing' CHECK (category IN ('ai', 'planning', 'marketing', 'tech')),
  pub_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX trend_articles_link_idx ON trend_articles(link);

-- RLS 비활성화 (1인 사용, Auth 없음)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on automations" ON automations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE trend_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on trend_articles" ON trend_articles FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copy text NOT NULL,
  reference text,
  size text NOT NULL DEFAULT '1080x1080',
  html text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on banners" ON banners FOR ALL USING (true) WITH CHECK (true);

-- Instagram integration
CREATE TABLE instagram_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  access_token text NOT NULL,
  user_id text NOT NULL DEFAULT '',
  token_type text NOT NULL DEFAULT 'long_lived',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE instagram_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on instagram_tokens" ON instagram_tokens FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE instagram_posts (
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
CREATE UNIQUE INDEX instagram_posts_ig_id_idx ON instagram_posts(ig_id);
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on instagram_posts" ON instagram_posts FOR ALL USING (true) WITH CHECK (true);

-- Threads integration
CREATE TABLE threads_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  access_token text NOT NULL,
  user_id text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE threads_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on threads_tokens" ON threads_tokens FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE threads_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threads_id text NOT NULL,
  text text DEFAULT '',
  media_type text DEFAULT '',
  permalink text DEFAULT '',
  timestamp timestamptz,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  repost_count integer DEFAULT 0,
  quote_count integer DEFAULT 0,
  fetched_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX threads_posts_threads_id_idx ON threads_posts(threads_id);
ALTER TABLE threads_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on threads_posts" ON threads_posts FOR ALL USING (true) WITH CHECK (true);

-- Insights
CREATE TABLE insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  memo text DEFAULT '',
  content_type text DEFAULT 'article' CHECK (content_type IN ('article', 'video', 'tweet', 'pdf', 'other', 'memory', 'swipe')),
  thumbnail_url text DEFAULT '',
  source_domain text DEFAULT '',
  tags text[] DEFAULT '{}',
  swipe_category text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX insights_url_idx ON insights(url);
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on insights" ON insights FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE google_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expiry_date bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on google_tokens" ON google_tokens FOR ALL USING (true) WITH CHECK (true);

-- Content Calendar
CREATE TABLE content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  scheduled_date date NOT NULL,
  scheduled_time time,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  content text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on content_calendar" ON content_calendar FOR ALL USING (true) WITH CHECK (true);

-- Email Drafts
CREATE TABLE email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_draft_id text,
  gmail_message_id text,
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text DEFAULT 'local' CHECK (status IN ('local','drafted','sent')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on email_drafts" ON email_drafts FOR ALL USING (true) WITH CHECK (true);

-- Figma Integration
CREATE TABLE figma_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  personal_access_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE figma_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on figma_tokens" ON figma_tokens FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE figma_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key text NOT NULL,
  file_name text DEFAULT '',
  node_id text,
  screenshot_url text,
  design_tokens jsonb DEFAULT '{}',
  banner_id uuid REFERENCES banners(id),
  figma_url text,
  status text DEFAULT 'pending',
  extracted_at timestamptz DEFAULT now()
);
ALTER TABLE figma_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on figma_extractions" ON figma_extractions FOR ALL USING (true) WITH CHECK (true);

-- Keyword Trends (weekly snapshots)
CREATE TABLE keyword_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'rss',
  related_article_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX keyword_trends_keyword_date_source_idx
  ON keyword_trends(keyword, snapshot_date, source);
ALTER TABLE keyword_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on keyword_trends" ON keyword_trends FOR ALL USING (true) WITH CHECK (true);

-- AI Daily Summaries
CREATE TABLE trend_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date NOT NULL UNIQUE,
  summary_text text NOT NULL,
  article_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trend_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on trend_summaries" ON trend_summaries FOR ALL USING (true) WITH CHECK (true);

-- Competitors
CREATE TABLE competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website_url text,
  meta_page_id text,
  sns_handles jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on competitors" ON competitors FOR ALL USING (true) WITH CHECK (true);

-- Weekly Competitor Briefings
CREATE TABLE competitor_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  briefing_text text NOT NULL,
  key_points text[] DEFAULT '{}',
  stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE competitor_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on competitor_briefings" ON competitor_briefings FOR ALL USING (true) WITH CHECK (true);

-- Competitor Ad Tracking
CREATE TABLE competitor_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'meta',
  ad_url text NOT NULL UNIQUE,
  creative_type text DEFAULT 'image',
  copy_text text,
  cta_text text,
  ai_analysis text,
  screenshot_url text,
  discovered_at timestamptz DEFAULT now()
);
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on competitor_ads" ON competitor_ads FOR ALL USING (true) WITH CHECK (true);
