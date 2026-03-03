-- Add article content columns for in-app reading
ALTER TABLE trend_articles ADD COLUMN IF NOT EXISTS content_text text DEFAULT '';
ALTER TABLE trend_articles ADD COLUMN IF NOT EXISTS content_html text DEFAULT '';
ALTER TABLE trend_articles ADD COLUMN IF NOT EXISTS og_image text DEFAULT '';
ALTER TABLE trend_articles ADD COLUMN IF NOT EXISTS fetched_at timestamptz;
