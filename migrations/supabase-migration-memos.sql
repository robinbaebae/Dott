-- Memos table for Obsidian-style note-taking
CREATE TABLE IF NOT EXISTS memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny direct access" ON memos FOR ALL USING (false);

CREATE INDEX idx_memos_user ON memos(user_id);
CREATE INDEX idx_memos_updated ON memos(updated_at DESC);
