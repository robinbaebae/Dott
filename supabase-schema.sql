-- Butter DB Schema for Supabase

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date date,
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
  category text DEFAULT 'beauty' CHECK (category IN ('beauty', 'fashion', 'ai', 'planning', 'marketing')),
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
