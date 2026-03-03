-- =====================================================
-- Pet Notifications: weekly_goals + notification_settings
-- =====================================================

-- Weekly Goals (per platform target)
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,          -- 'instagram', 'blog', 'newsletter', 'threads'
  target_count INTEGER NOT NULL DEFAULT 1,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform, user_id)
);

ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_goals_all" ON weekly_goals FOR ALL USING (true);

-- Notification Settings (per user, category toggles)
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id TEXT PRIMARY KEY,
  tasks_enabled BOOLEAN DEFAULT true,
  briefing_enabled BOOLEAN DEFAULT true,
  token_enabled BOOLEAN DEFAULT true,
  trends_enabled BOOLEAN DEFAULT true,
  content_calendar_enabled BOOLEAN DEFAULT true,
  sns_performance_enabled BOOLEAN DEFAULT true,
  weekly_goals_enabled BOOLEAN DEFAULT true,
  work_time_enabled BOOLEAN DEFAULT true,
  meeting_dnd_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_settings_all" ON notification_settings FOR ALL USING (true);
