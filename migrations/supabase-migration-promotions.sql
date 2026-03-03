-- Migration: Promotion design tool (프로모션 설계)
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS promotions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '할인율',
  discount_value text DEFAULT '',
  target text NOT NULL DEFAULT '전체',
  start_date date,
  end_date date,
  budget integer DEFAULT 0,
  goal text DEFAULT '',
  description text DEFAULT '',
  ai_copy text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_user ON promotions (user_id, created_at DESC);
