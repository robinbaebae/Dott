-- Brand Guide (single-row, upsert pattern)
CREATE TABLE brand_guide (
  id text PRIMARY KEY DEFAULT 'default',
  brand_name text NOT NULL DEFAULT '',
  brand_description text DEFAULT '',
  target_audience text DEFAULT '',
  tone text DEFAULT 'professional' CHECK (tone IN ('formal', 'casual', 'friendly', 'playful', 'professional')),
  keywords text[] DEFAULT '{}',
  avoid_keywords text[] DEFAULT '{}',
  website_url text DEFAULT '',
  additional_notes text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brand_guide ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on brand_guide" ON brand_guide FOR ALL USING (true) WITH CHECK (true);

-- Seed default row
INSERT INTO brand_guide (id) VALUES ('default') ON CONFLICT DO NOTHING;
