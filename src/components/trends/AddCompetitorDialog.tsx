'use client';

import { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const snsHandles: Record<string, string> = {};
      if (instagram.trim()) snsHandles.instagram = instagram.trim();

      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website_url: websiteUrl.trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 채널톡"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">웹사이트</label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Instagram</label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@handle"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {saving ? '추가 중...' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
