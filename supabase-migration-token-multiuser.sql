-- ============================================================
-- Token Tables Multi-User Migration
-- Change id: 'default' pattern to id: user_email pattern
-- Remove default values so each row requires an explicit user id
-- Uses DO blocks so missing tables are safely skipped.
-- ============================================================

-- google_tokens: remove DEFAULT 'default' from id column
DO $$
BEGIN
  ALTER TABLE google_tokens ALTER COLUMN id DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'google_tokens does not exist, skipping';
WHEN others THEN
  RAISE NOTICE 'google_tokens: %', SQLERRM;
END $$;

-- instagram_tokens: remove DEFAULT 'default' from id column
DO $$
BEGIN
  ALTER TABLE instagram_tokens ALTER COLUMN id DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'instagram_tokens does not exist, skipping';
WHEN others THEN
  RAISE NOTICE 'instagram_tokens: %', SQLERRM;
END $$;

-- threads_tokens: create if not exists, then remove default
CREATE TABLE IF NOT EXISTS threads_tokens (
  id text PRIMARY KEY,
  user_id text,
  access_token text,
  threads_user_id text,
  username text,
  updated_at timestamptz DEFAULT now()
);
DO $$
BEGIN
  ALTER TABLE threads_tokens ALTER COLUMN id DROP DEFAULT;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'threads_tokens: %', SQLERRM;
END $$;

-- figma_tokens: remove DEFAULT 'default' from id column
DO $$
BEGIN
  ALTER TABLE figma_tokens ALTER COLUMN id DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'figma_tokens does not exist, skipping';
WHEN others THEN
  RAISE NOTICE 'figma_tokens: %', SQLERRM;
END $$;

-- brand_guide: remove DEFAULT 'default' from id column
DO $$
BEGIN
  ALTER TABLE brand_guide ALTER COLUMN id DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'brand_guide does not exist, skipping';
WHEN others THEN
  RAISE NOTICE 'brand_guide: %', SQLERRM;
END $$;

-- token_usage table (ensure exists with proper schema)
CREATE TABLE IF NOT EXISTS token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
-- Add user_id column if table existed without it
DO $$
BEGIN
  ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS user_id text;
  ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS tokens_in integer DEFAULT 0;
  ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS tokens_out integer DEFAULT 0;
  ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
EXCEPTION WHEN others THEN
  RAISE NOTICE 'token_usage columns: %', SQLERRM;
END $$;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  DROP POLICY IF EXISTS "Deny direct access" ON token_usage;
  CREATE POLICY "Deny direct access" ON token_usage FOR ALL USING (false);
END $$;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_token_usage_user ON token_usage(user_id);
  CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at);
EXCEPTION WHEN others THEN
  RAISE NOTICE 'token_usage indexes: %', SQLERRM;
END $$;
