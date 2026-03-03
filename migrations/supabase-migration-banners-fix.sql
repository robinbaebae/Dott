-- Fix: Ensure banners table exists (resolves schema cache error)
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copy text NOT NULL,
  reference text,
  size text NOT NULL DEFAULT '1080x1080',
  html text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on banners" ON banners;
CREATE POLICY "Allow all on banners" ON banners FOR ALL USING (true) WITH CHECK (true);
