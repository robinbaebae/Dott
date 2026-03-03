-- Migration: Add soft delete to memos (trash/recycle bin)
-- Run this in Supabase SQL editor

ALTER TABLE memos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for filtering active vs trashed memos
CREATE INDEX IF NOT EXISTS idx_memos_deleted_at ON memos (deleted_at);
