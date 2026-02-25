-- =====================================================
-- Influencer Marketing: influencers + influencer_campaigns
-- =====================================================

CREATE TABLE IF NOT EXISTS influencers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',  -- instagram, youtube, tiktok, blog
  followers INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  category TEXT,                                -- beauty, tech, food, lifestyle, etc.
  bio TEXT,
  email TEXT,
  phone TEXT,
  profile_image_url TEXT,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  price_range TEXT,                             -- e.g. '50-100만원'
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "influencers_all" ON influencers FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS influencer_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'identified',    -- identified, contacted, negotiating, contracted, live, completed, rejected
  campaign_type TEXT,                           -- sponsored_post, review, ambassador, giveaway, collab
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
CREATE POLICY "influencer_campaigns_all" ON influencer_campaigns FOR ALL USING (true);
