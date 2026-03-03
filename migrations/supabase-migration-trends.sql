-- ============================================
-- 트렌드 탭 리뉴얼 마이그레이션
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- 1. 기존 beauty/fashion 기사 삭제
DELETE FROM trend_articles WHERE category IN ('beauty', 'fashion');

-- 2. trend_articles 카테고리 제약 업데이트
ALTER TABLE trend_articles DROP CONSTRAINT IF EXISTS trend_articles_category_check;
ALTER TABLE trend_articles ADD CONSTRAINT trend_articles_category_check
  CHECK (category IN ('ai', 'planning', 'marketing', 'tech'));
ALTER TABLE trend_articles ALTER COLUMN category SET DEFAULT 'marketing';

-- 3. 키워드 트렌드 스냅샷
CREATE TABLE IF NOT EXISTS keyword_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'rss',
  related_article_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS keyword_trends_keyword_date_source_idx
  ON keyword_trends(keyword, snapshot_date, source);
ALTER TABLE keyword_trends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on keyword_trends" ON keyword_trends;
CREATE POLICY "Allow all on keyword_trends" ON keyword_trends FOR ALL USING (true) WITH CHECK (true);

-- 4. AI 일일 요약 캐시
CREATE TABLE IF NOT EXISTS trend_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date NOT NULL UNIQUE,
  summary_text text NOT NULL,
  article_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trend_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on trend_summaries" ON trend_summaries;
CREATE POLICY "Allow all on trend_summaries" ON trend_summaries FOR ALL USING (true) WITH CHECK (true);

-- 5. 경쟁사
CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website_url text,
  meta_page_id text,
  sns_handles jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on competitors" ON competitors;
CREATE POLICY "Allow all on competitors" ON competitors FOR ALL USING (true) WITH CHECK (true);

-- 6. 주간 브리핑
CREATE TABLE IF NOT EXISTS competitor_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  briefing_text text NOT NULL,
  key_points text[] DEFAULT '{}',
  stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE competitor_briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on competitor_briefings" ON competitor_briefings;
CREATE POLICY "Allow all on competitor_briefings" ON competitor_briefings FOR ALL USING (true) WITH CHECK (true);

-- 7. 광고 소재 트래킹
CREATE TABLE IF NOT EXISTS competitor_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'meta',
  ad_url text NOT NULL UNIQUE,
  creative_type text DEFAULT 'image',
  copy_text text,
  cta_text text,
  ai_analysis text,
  screenshot_url text,
  discovered_at timestamptz DEFAULT now()
);
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on competitor_ads" ON competitor_ads;
CREATE POLICY "Allow all on competitor_ads" ON competitor_ads FOR ALL USING (true) WITH CHECK (true);
