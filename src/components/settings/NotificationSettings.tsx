'use client';

import { useState, useEffect } from 'react';

interface NotifSettings {
  tasks_enabled: boolean;
  briefing_enabled: boolean;
  token_enabled: boolean;
  trends_enabled: boolean;
  content_calendar_enabled: boolean;
  sns_performance_enabled: boolean;
  weekly_goals_enabled: boolean;
  work_time_enabled: boolean;
  meeting_dnd_enabled: boolean;
}

const CATEGORIES: { key: keyof NotifSettings; label: string; desc: string }[] = [
  { key: 'tasks_enabled', label: '할 일 알림', desc: '마감 전 리마인더, 지연 알림' },
  { key: 'briefing_enabled', label: '데일리 브리핑', desc: '매일 오전 10시 요약 브리핑' },
  { key: 'token_enabled', label: '토큰 사용량', desc: '매시간 토큰 사용 현황' },
  { key: 'trends_enabled', label: '트렌드 알림', desc: '새 업계 소식 감지 시' },
  { key: 'content_calendar_enabled', label: '콘텐츠 캘린더', desc: '발행 1시간/15분 전 알림' },
  { key: 'sns_performance_enabled', label: 'SNS 성과', desc: '게시물 참여율 이상 감지' },
  { key: 'weekly_goals_enabled', label: '주간 목표', desc: '월요일/금요일 목표 추적' },
  { key: 'work_time_enabled', label: '작업 시간', desc: '작업 시간 마일스톤 응원' },
  { key: 'meeting_dnd_enabled', label: '미팅 DND', desc: '미팅 시 방해금지 모드 제안' },
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotifSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/notifications/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  const toggle = async (key: keyof NotifSettings) => {
    if (!settings) return;
    const newVal = !settings[key];
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);

    setSaving(true);
    try {
      await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      });
    } catch { /* revert silently */ }
    setSaving(false);
  };

  if (!settings) {
    return <p className="text-sm text-muted-foreground">로딩 중...</p>;
  }

  return (
    <div className="space-y-1">
      {CATEGORIES.map((cat) => (
        <div
          key={cat.key}
          className="flex items-center justify-between py-2.5 px-1"
        >
          <div>
            <p className="text-sm font-medium">{cat.label}</p>
            <p className="text-xs text-muted-foreground">{cat.desc}</p>
          </div>
          <button
            onClick={() => toggle(cat.key)}
            disabled={saving}
            className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
              settings[cat.key]
                ? 'bg-accent'
                : 'bg-muted-foreground/20'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                settings[cat.key] ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
