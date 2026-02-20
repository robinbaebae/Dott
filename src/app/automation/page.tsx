'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AutomationCard from '@/components/automation/AutomationCard';
import BannerGenerator from '@/components/content/BannerGenerator';
import InstagramPosts from '@/components/content/InstagramPosts';
import ThreadsPosts from '@/components/content/ThreadsPosts';
import { Automation, AutomationType } from '@/types';

export default function ContentPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AutomationType>('content_generation');
  const [newPrompt, setNewPrompt] = useState('');

  const loadAutomations = useCallback(async () => {
    const res = await fetch('/api/automation');
    const data = await res.json();
    setAutomations(data);
  }, []);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const createAutomation = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    await fetch('/api/automation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        type: newType,
        prompt_template: newPrompt,
      }),
    });
    setNewName('');
    setNewType('content_generation');
    setNewPrompt('');
    setDialogOpen(false);
    loadAutomations();
  };

  const deleteAutomation = async (id: string) => {
    await fetch(`/api/automation?id=${id}`, { method: 'DELETE' });
    loadAutomations();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">컨텐츠</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI로 마케팅 컨텐츠를 만들고 자동화하세요
        </p>
      </div>

      {/* AI 배너 생성 */}
      <BannerGenerator />

      {/* Instagram */}
      <InstagramPosts />

      {/* Threads */}
      <ThreadsPosts />

      {/* AI 자동화 섹션 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">AI 자동화</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">+ 새 자동화</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 자동화 만들기</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input
                  placeholder="자동화 이름"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Select value={newType} onValueChange={(v) => setNewType(v as AutomationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content_generation">콘텐츠 생성</SelectItem>
                    <SelectItem value="ad_report">광고 리포트</SelectItem>
                    <SelectItem value="brand_copy">브랜드 카피</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="프롬프트 템플릿을 입력하세요"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={4}
                />
                <Button onClick={createAutomation} className="w-full">
                  만들기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {automations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🎨</p>
            <h3 className="text-lg font-semibold mb-1">아직 자동화가 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              새 자동화를 만들어 반복 업무를 줄여보세요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((automation) => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onDelete={deleteAutomation}
                onRefresh={loadAutomations}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
