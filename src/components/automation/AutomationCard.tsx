'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Automation, AutomationType } from '@/types';

const TYPE_LABELS: Record<AutomationType, string> = {
  content_generation: '콘텐츠 생성',
  ad_report: '광고 리포트',
  brand_copy: '브랜드 카피',
};

const TYPE_COLORS: Record<AutomationType, string> = {
  content_generation: 'bg-purple-100 text-purple-800',
  ad_report: 'bg-orange-100 text-orange-800',
  brand_copy: 'bg-pink-100 text-pink-800',
};

interface AutomationCardProps {
  automation: Automation;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function AutomationCard({ automation, onDelete, onRefresh }: AutomationCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(automation.last_result || '');
  const [showInput, setShowInput] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setResult('');
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          id: automation.id,
          input: input || undefined,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        onRefresh();
      } else {
        setResult('오류: ' + (data.error || '실행 실패'));
      }
    } catch {
      setResult('오류: 네트워크 오류');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{automation.name}</CardTitle>
            <Badge variant="secondary" className={TYPE_COLORS[automation.type]}>
              {TYPE_LABELS[automation.type]}
            </Badge>
          </div>
          <button
            onClick={() => onDelete(automation.id)}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            삭제
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">프롬프트 템플릿</p>
          <p className="text-sm bg-muted p-2 rounded-md line-clamp-3">
            {automation.prompt_template}
          </p>
        </div>

        {showInput && (
          <Textarea
            placeholder="추가 입력 (선택사항)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
          />
        )}

        <div className="flex gap-2">
          <Button onClick={handleRun} disabled={isRunning} size="sm">
            {isRunning ? '실행 중...' : '▶ 실행'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? '입력 숨기기' : '입력 추가'}
          </Button>
        </div>

        {result && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">실행 결과</p>
            <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap max-h-64 overflow-auto">
              {result}
            </div>
            {automation.last_run_at && (
              <p className="text-xs text-muted-foreground mt-1">
                마지막 실행: {new Date(automation.last_run_at).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
