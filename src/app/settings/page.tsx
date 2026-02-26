'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { User, Palette, Bell, BookOpen, Key, ChevronDown } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';
import BrandGuideForm from '@/components/settings/BrandGuideForm';
import NotificationSettings from '@/components/settings/NotificationSettings';
import ApiKeyForm from '@/components/settings/ApiKeyForm';

const SIDEBAR_ALWAYS_KEY = 'dott-sidebar-always-collapsed';
const GLASS_EFFECT_KEY = 'dott-glass-effect';
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-accent' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl overflow-hidden glass-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="size-4 text-accent shrink-0" />
          <div className="text-left">
            <span className="text-sm font-medium">{title}</span>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

function AppearanceSettings() {
  const [sidebarAlways, setSidebarAlways] = useState(false);
  const [glassEffect, setGlassEffect] = useState(true);

  useEffect(() => {
    setSidebarAlways(localStorage.getItem(SIDEBAR_ALWAYS_KEY) === 'true');
    setGlassEffect(localStorage.getItem(GLASS_EFFECT_KEY) !== 'false');
  }, []);

  const handleSidebarToggle = useCallback((v: boolean) => {
    setSidebarAlways(v);
    localStorage.setItem(SIDEBAR_ALWAYS_KEY, String(v));
    window.dispatchEvent(new StorageEvent('storage', { key: SIDEBAR_ALWAYS_KEY, newValue: String(v) }));
  }, []);

  const handleGlassToggle = useCallback((v: boolean) => {
    setGlassEffect(v);
    localStorage.setItem(GLASS_EFFECT_KEY, String(v));
    if (v) {
      document.documentElement.classList.remove('no-glass');
    } else {
      document.documentElement.classList.add('no-glass');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm">사이드바 항상 접기</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">사이드바를 아이콘 모드로 고정합니다</p>
        </div>
        <Toggle checked={sidebarAlways} onChange={handleSidebarToggle} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm">글래스 효과</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">유리같은 반투명 효과를 적용합니다</p>
        </div>
        <Toggle checked={glassEffect} onChange={handleGlassToggle} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">

      <SettingsSection icon={BookOpen} title="Brand Guide" description="AI가 콘텐츠 작성 시 참고하는 브랜드 정보">
        <BrandGuideForm />
      </SettingsSection>

      <SettingsSection icon={Key} title="AI API Key" description="Claude AI 사용을 위한 개인 API 키">
        <ApiKeyForm />
      </SettingsSection>

      <SettingsSection icon={User} title="Account">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{session?.user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm">{session?.user?.name ?? '—'}</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={Palette} title="Appearance" description="테마, 사이드바, 글래스 효과 설정">
        <AppearanceSettings />
      </SettingsSection>

      <SettingsSection icon={Bell} title="Notifications" description="미니펫 알림 카테고리별 ON/OFF">
        <NotificationSettings />
      </SettingsSection>
    </div>
  );
}
