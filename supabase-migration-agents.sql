-- =============================================
-- Dott Agent Architecture - Database Migration
-- =============================================

-- Agent definitions
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

-- Agent task execution log
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

-- Activity logs (SOT)
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  agent_id text REFERENCES agents(id),
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Daily reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  report_text text NOT NULL,
  stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agent_tasks" ON agent_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daily_reports" ON daily_reports FOR ALL USING (true) WITH CHECK (true);

-- Seed agents
INSERT INTO agents (id, name, name_ko, role, description, skills, icon) VALUES
  ('orchestrator', 'Orchestrator', '오케스트레이터', 'orchestrator', '팀장 역할. 사용자 입력을 분류하고 적절한 에이전트에게 라우팅합니다.', '{classify,route,review}', '🎯'),
  ('marketing', 'Marketing Expert', '마케팅 전문가', 'marketing', '광고 카피, SNS 전략, 캠페인 기획, 퍼포먼스 분석 등 마케팅 전반을 담당합니다.', '{ad_copy,campaign_plan,social_strategy,performance_analysis,content_writing,email_draft}', '📢'),
  ('design', 'Design Expert', '디자인 전문가', 'design', '배너 생성, Figma 연동, 디자인 리뷰, 크리에이티브 디렉션을 담당합니다.', '{banner_generate,figma_push,design_review,creative_direction}', '🎨'),
  ('research', 'Research Expert', '리서치 전문가', 'research', '트렌드 분석, 경쟁사 리서치, 시장 조사, SEO 키워드 분석을 담당합니다.', '{trend_analysis,competitor_research,market_research,seo_keyword}', '🔍'),
  ('service_builder', 'Service Builder', '서비스 빌더', 'service_builder', '제로투원 개발, 기능 확장, 버그 수정, 시스템 개선을 담당합니다.', '{feature_build,bug_fix,system_extend}', '🛠️')
ON CONFLICT (id) DO NOTHING;
