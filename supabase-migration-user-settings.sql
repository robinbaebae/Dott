-- User settings table (API keys, preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id text PRIMARY KEY,
  anthropic_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
