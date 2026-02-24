-- Content Projects: AI-driven content production workflow
CREATE TABLE IF NOT EXISTS content_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  platforms text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'idea_proposed'
    CHECK (status IN ('idea_proposed', 'topic_selected', 'drafting', 'review', 'confirmed', 'scheduled', 'published')),
  ideas jsonb DEFAULT '[]',
  selected_idea_index integer,
  drafts jsonb DEFAULT '{}',
  banner_id uuid REFERENCES banners(id),
  banner_html text,
  ai_explanation text,
  user_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on content_projects" ON content_projects FOR ALL USING (true) WITH CHECK (true);

-- Ad Creative Pipeline Projects
CREATE TABLE IF NOT EXISTS ad_creative_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'stage_1'
    CHECK (status IN ('stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'completed')),
  template_config jsonb DEFAULT '{}',
  creatives jsonb DEFAULT '[]',
  ad_copies jsonb DEFAULT '[]',
  campaign_config jsonb DEFAULT '{}',
  campaign_id text,
  performance_data jsonb DEFAULT '{}',
  ai_report text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ad_creative_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on ad_creative_projects" ON ad_creative_projects FOR ALL USING (true) WITH CHECK (true);
