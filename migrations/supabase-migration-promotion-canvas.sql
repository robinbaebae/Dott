-- Promotion Canvas & Channels Migration
-- Run this after supabase-migration-promotions.sql

-- Canvas state storage (nodes, edges, viewport)
CREATE TABLE IF NOT EXISTS promotion_canvas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  nodes jsonb NOT NULL DEFAULT '[]',
  edges jsonb NOT NULL DEFAULT '[]',
  viewport jsonb DEFAULT '{"x":0,"y":0,"zoom":1}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_canvas_user ON promotion_canvas (user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_canvas_promotion ON promotion_canvas (promotion_id);

-- Channel details per promotion
CREATE TABLE IF NOT EXISTS promotion_channels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  channel_type text NOT NULL,
  budget_amount integer DEFAULT 0,
  usp text DEFAULT '',
  cta_text text DEFAULT '',
  ai_copy text DEFAULT '',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_channels_promotion ON promotion_channels (promotion_id);

-- Extend promotions table
ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS phases jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS audience_segments jsonb DEFAULT '[]';
