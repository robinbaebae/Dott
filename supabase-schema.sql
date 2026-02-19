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
  category text DEFAULT 'beauty' CHECK (category IN ('beauty', 'fashion')),
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
