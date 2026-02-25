'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { ParsedCampaign } from './DataImporter';

interface Props {
  campaigns: ParsedCampaign[];
  platform: 'google' | 'meta';
}

export default function AiAnalysisPanel({ campaigns, platform }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ad-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaigns, platform }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      } else {
        setError('분석 요청에 실패했습니다. 다시 시도해주세요.');
      }
    } catch {
      setError('분석 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            <h3 className="text-sm font-semibold">AI Analysis</h3>
          </div>
          <Button
            size="sm"
            onClick={requestAnalysis}
            disabled={loading || campaigns.length === 0}
            className="gap-1.5"
          >
            <Sparkles className={`size-3.5 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Analyze with AI'}
          </Button>
        </div>

        {!analysis && !loading && !error && (
          <p className="text-xs text-muted-foreground">
            AI가 캠페인 데이터를 분석하여 성과 요약, 개선 방안, 예산 배분 제안을 제공합니다.
          </p>
        )}

        {loading && !analysis && (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="size-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">데이터 분석 중...</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {analysis && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg border bg-muted/20 p-5 max-h-[480px] overflow-y-auto">
            {analysis}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
