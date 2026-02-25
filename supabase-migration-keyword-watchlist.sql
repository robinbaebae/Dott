-- Keyword Watchlist table for user-registered keyword tracking
CREATE TABLE IF NOT EXISTS keyword_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(keyword, user_id)
);

ALTER TABLE keyword_watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on keyword_watchlist" ON keyword_watchlist;
CREATE POLICY "Allow all on keyword_watchlist"
  ON keyword_watchlist FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS keyword_watchlist_user_idx
  ON keyword_watchlist(user_id);
