'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onAdded: () => void;
  trigger?: React.ReactNode;
}

export default function AddCompetitorDialog({ onAdded, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [manualWebsite, setManualWebsite] = useState(false);
  const [manualInstagram, setManualInstagram] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCompanyInfo = useCallback(async (companyName: string) => {
    if (companyName.trim().length < 2) return;
    setSearching(true);
    setSearchDone(false);
    try {
      const res = await fetch(
        `/api/competitors/search?name=${encodeURIComponent(companyName.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.website && !manualWebsite) setWebsiteUrl(data.website);
        if (data.instagram && !manualInstagram) setInstagram(data.instagram);
      }
    } catch {
      // silent fail
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [manualWebsite, manualInstagram]);

  const handleNameChange = (value: string) => {
    setName(value);
    setSearchDone(false);
    if (!manualWebsite) setWebsiteUrl('');
    if (!manualInstagram) setInstagram('');
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length >= 2) {
      searchTimer.current = setTimeout(() => {
        searchCompanyInfo(value);
      }, 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !websiteUrl.trim()) return;

    setSaving(true);
    try {
      const snsHandles: Record<string, string> = {};
      if (instagram.trim()) snsHandles.instagram = instagram.trim();

      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website_url: websiteUrl.trim(),
          sns_handles: snsHandles,
        }),
      });

      if (res.ok) {
        setName('');
        setWebsiteUrl('');
        setInstagram('');
        setOpen(false);
        onAdded();
      }
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = name.trim() && websiteUrl.trim() && !saving && !searching;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setName('');
        setWebsiteUrl('');
        setInstagram('');
        setSearching(false);
        setSearchDone(false);
        setManualWebsite(false);
        setManualInstagram(false);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">+ 경쟁사 추가</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>경쟁사 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">이름 *</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="예: 채널톡"
              required
            />
            {searching && (
              <p className="text-[11px] text-muted-foreground mt-1 animate-pulse">
                웹사이트 · Instagram 검색 중...
              </p>
            )}
            {searchDone && !searching && !websiteUrl && name.trim().length >= 2 && (
              <p className="text-[11px] text-orange-500 mt-1">
                웹사이트를 찾지 못했습니다. 직접 입력해주세요.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">웹사이트 *</label>
            <Input
              value={websiteUrl}
              onChange={(e) => { setWebsiteUrl(e.target.value); setManualWebsite(true); }}
              placeholder="https://example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Instagram</label>
            <Input
              value={instagram}
              onChange={(e) => { setInstagram(e.target.value); setManualInstagram(true); }}
              placeholder="@handle"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {saving ? '추가 중...' : searching ? '검색 중...' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
