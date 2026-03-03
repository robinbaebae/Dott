-- Figma Designs table: stores AI-generated design HTML for Figma push
CREATE TABLE IF NOT EXISTS figma_designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  size TEXT DEFAULT '1080x1080',
  html TEXT NOT NULL,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'pushing', 'pushed', 'failed')),
  figma_url TEXT,
  figma_file_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_figma_designs_user ON figma_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_figma_designs_status ON figma_designs(status);
