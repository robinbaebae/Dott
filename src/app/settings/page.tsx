'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Palette, Bell, BookOpen } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';
import BrandGuideForm from '@/components/settings/BrandGuideForm';
import NotificationSettings from '@/components/settings/NotificationSettings';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-6xl mx-auto px-6 pt-6 pb-12 space-y-6 animate-in fade-in duration-500">

      {/* Brand Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-accent" />
            <CardTitle className="text-base">Brand Guide</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI가 콘텐츠 작성 시 참고하는 브랜드 정보
          </p>
        </CardHeader>
        <CardContent>
          <BrandGuideForm />
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-4 text-accent" />
            <CardTitle className="text-base">Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{session?.user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm">{session?.user?.name ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-accent" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-accent" />
            <CardTitle className="text-base">Notifications</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            미니펫 알림 카테고리별 ON/OFF
          </p>
        </CardHeader>
        <CardContent>
          <NotificationSettings />
        </CardContent>
      </Card>
    </div>
  );
}
