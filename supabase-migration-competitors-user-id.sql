-- Add user_id column to competitors table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE competitors ADD COLUMN IF NOT EXISTS user_id text;

-- Backfill existing rows (optional: set to your email)
-- UPDATE competitors SET user_id = 'your-email@example.com' WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS competitors_user_id_idx ON competitors(user_id);
