'use client';

import { useState, useEffect } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Send, ChevronDown, ChevronUp, Eye, Code, Check } from 'lucide-react';

interface DraftItem {
  id: string;
  subject: string;
  to: string;
  snippet: string;
  updated: string;
}

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'urgent', label: 'Urgent' },
];

export default function EmailComposer() {
  const [to, setTo] = useState('');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [tone, setTone] = useState('professional');

  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [error, setError] = useState('');

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/gmail/drafts');
      if (res.ok) {
        const data = await res.json();
        setDrafts(data);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const generateEmail = async () => {
    if (!to.trim() || !topic.trim() || isGenerating) return;
    setIsGenerating(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', to, topic, details, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSubject(data.subject);
        setGeneratedBody(data.body_html);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate email');
      }
    } catch {
      setError('Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToDraft = async () => {
    if (!generatedSubject || !generatedBody || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const res = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          to,
          subject: generatedSubject,
          bodyHtml: generatedBody,
        }),
      });
      if (res.ok) {
        setSaved(true);
        fetchDrafts();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save draft');
      }
    } catch {
      setError('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="size-5" />
          Email / Newsletter
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI로 이메일을 작성하고 Gmail 임시보관함에 저장합니다
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input fields */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">받는 사람 (To) *</label>
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">목적 / 주제 *</label>
          <Input
            placeholder="예: 신제품 출시 안내, 프로모션 공지..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">상세 내용</label>
          <Textarea
            placeholder="포함할 내용, 강조 포인트, CTA 등..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">톤</label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={generateEmail}
          disabled={!to.trim() || !topic.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? 'AI로 작성 중...' : 'AI로 작성하기'}
        </Button>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Generated result */}
        {generatedSubject && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
            <div>
              <label className="text-sm font-medium mb-1.5 block">제목</label>
              <Input
                value={generatedSubject}
                onChange={(e) => setGeneratedSubject(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">본문</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-7 text-xs gap-1"
                >
                  {showPreview ? <Code className="size-3" /> : <Eye className="size-3" />}
                  {showPreview ? 'HTML 편집' : '미리보기'}
                </Button>
              </div>
              {showPreview ? (
                <div
                  className="border rounded-md p-4 bg-white text-sm max-h-80 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedBody) }}
                />
              ) : (
                <Textarea
                  value={generatedBody}
                  onChange={(e) => setGeneratedBody(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              )}
            </div>

            <Button
              onClick={saveToDraft}
              disabled={isSaving || saved}
              className="w-full gap-2"
              variant={saved ? 'outline' : 'default'}
            >
              {saved ? (
                <>
                  <Check className="size-4" />
                  Gmail 임시보관함에 저장됨
                </>
              ) : isSaving ? (
                '저장 중...'
              ) : (
                <>
                  <Send className="size-4" />
                  Gmail 임시보관함에 저장
                </>
              )}
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="flex items-center justify-center py-4">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Recent Drafts */}
        {drafts.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showDrafts ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              최근 임시보관함 ({drafts.length})
            </button>
            {showDrafts && (
              <div className="mt-3 space-y-2">
                {drafts.map((d) => (
                  <div key={d.id} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                    <p className="text-sm font-medium truncate">{d.subject || '(제목 없음)'}</p>
                    <p className="text-xs text-muted-foreground truncate">To: {d.to || '-'}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
