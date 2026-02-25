-- =============================================
-- Dott: Combined Migration (agents + influencers + pet-notifications)
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- =============================================
-- 1. Agent Architecture
-- =============================================

CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_ko text NOT NULL,
  role text NOT NULL,
  description text,
  skills text[] DEFAULT '{}',
  system_prompt text,
  icon text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text REFERENCES agents(id),
  input_text text NOT NULL,
  output_text text,
  status text NOT NULL DEFAULT 'pending',
  skill_used text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  agent_id text REFERENCES agents(id),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  report_text text NOT NULL,
  stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS for agent tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agents' AND policyname='Allow all on agents') THEN
    CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_tasks' AND policyname='Allow all on agent_tasks') THEN
    CREATE POLICY "Allow all on agent_tasks" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='Allow all on activity_logs') THEN
    CREATE POLICY "Allow all on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_reports' AND policyname='Allow all on daily_reports') THEN
    CREATE POLICY "Allow all on daily_reports" ON daily_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed agents
INSERT INTO agents (id, name, name_ko, role, description, skills, icon) VALUES
  ('orchestrator', 'Orchestrator', '오케스트레이터', 'orchestrator', '팀장 역할. 사용자 입력을 분류하고 적절한 에이전트에게 라우팅합니다.', '{classify,route,review}', '🎯'),
  ('marketing', 'Marketing Expert', '마케팅 전문가', 'marketing', '광고 카피, SNS 전략, 캠페인 기획, 퍼포먼스 분석 등 마케팅 전반을 담당합니다.', '{ad_copy,campaign_plan,social_strategy,performance_analysis,content_writing,email_draft}', '📢'),
  ('design', 'Design Expert', '디자인 전문가', 'design', '배너 생성, Figma 연동, 디자인 리뷰, 크리에이티브 디렉션을 담당합니다.', '{banner_generate,figma_push,design_review,creative_direction}', '🎨'),
  ('research', 'Research Expert', '리서치 전문가', 'research', '트렌드 분석, 경쟁사 리서치, 시장 조사, SEO 키워드 분석을 담당합니다.', '{trend_analysis,competitor_research,market_research,seo_keyword}', '🔍'),
  ('service_builder', 'Service Builder', '서비스 빌더', 'service_builder', '제로투원 개발, 기능 확장, 버그 수정, 시스템 개선을 담당합니다.', '{feature_build,bug_fix,system_extend}', '🛠️')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. Influencer Marketing
-- =============================================

CREATE TABLE IF NOT EXISTS influencers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  followers INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  category TEXT,
  bio TEXT,
  email TEXT,
  phone TEXT,
  profile_image_url TEXT,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  price_range TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='influencers' AND policyname='influencers_all') THEN
    CREATE POLICY "influencers_all" ON influencers FOR ALL USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS influencer_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'identified',
  campaign_type TEXT,
  budget REAL,
  deliverables TEXT,
  start_date DATE,
  end_date DATE,
  performance_data JSONB DEFAULT '{}',
  notes TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE influencer_campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='influencer_campaigns' AND policyname='influencer_campaigns_all') THEN
    CREATE POLICY "influencer_campaigns_all" ON influencer_campaigns FOR ALL USING (true);
  END IF;
END $$;

-- =============================================
-- 3. Pet Notifications
-- =============================================

CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, user_id)
);

ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weekly_goals' AND policyname='weekly_goals_all') THEN
    CREATE POLICY "weekly_goals_all" ON weekly_goals FOR ALL USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id TEXT PRIMARY KEY,
  tasks_enabled BOOLEAN DEFAULT true,
  briefing_enabled BOOLEAN DEFAULT true,
  token_enabled BOOLEAN DEFAULT true,
  trends_enabled BOOLEAN DEFAULT true,
  content_calendar_enabled BOOLEAN DEFAULT true,
  sns_performance_enabled BOOLEAN DEFAULT true,
  weekly_goals_enabled BOOLEAN DEFAULT true,
  work_time_enabled BOOLEAN DEFAULT true,
  meeting_dnd_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_settings' AND policyname='notification_settings_all') THEN
    CREATE POLICY "notification_settings_all" ON notification_settings FOR ALL USING (true);
  END IF;
END $$;

-- =============================================
-- Done! Verify with:
-- SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
-- =============================================
