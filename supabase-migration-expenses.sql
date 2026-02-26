-- Migration: Corporate card expense ledger (법인카드 가계부)
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  amount integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '기타',
  payment_method text NOT NULL DEFAULT '법인카드',
  memo text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (user_id, category);
