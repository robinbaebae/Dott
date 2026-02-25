'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardPaste, FileSpreadsheet, X } from 'lucide-react';

export interface ParsedCampaign {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Ended';
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  convRate: number;
  roas: number;
  costPerConv: number;
}

// Column name normalization map — handles Google Ads / Meta Ads export variations
const COLUMN_MAP: Record<string, keyof ParsedCampaign> = {
  campaign: 'name',
  'campaign name': 'name',
  campaign_name: 'name',
  캠페인: 'name',
  '캠페인 이름': 'name',
  status: 'status',
  'campaign status': 'status',
  상태: 'status',
  impressions: 'impressions',
  impr: 'impressions',
  'impr.': 'impressions',
  노출: 'impressions',
  노출수: 'impressions',
  clicks: 'clicks',
  클릭: 'clicks',
  클릭수: 'clicks',
  ctr: 'ctr',
  'click-through rate': 'ctr',
  '클릭률': 'ctr',
  'avg. cpc': 'cpc',
  cpc: 'cpc',
  'avg cpc': 'cpc',
  '평균 cpc': 'cpc',
  'avg. cpm': 'cpm',
  cpm: 'cpm',
  cost: 'spend',
  spend: 'spend',
  'amount spent': 'spend',
  비용: 'spend',
  '지출 금액': 'spend',
  conversions: 'conversions',
  conv: 'conversions',
  'conv.': 'conversions',
  results: 'conversions',
  전환: 'conversions',
  전환수: 'conversions',
  'conv. rate': 'convRate',
  'conversion rate': 'convRate',
  전환율: 'convRate',
  roas: 'roas',
  'return on ad spend': 'roas',
  'conv. value/cost': 'roas',
  '광고 수익률': 'roas',
  'cost / conv.': 'costPerConv',
  'cost per result': 'costPerConv',
  'cost/conv': 'costPerConv',
  '전환당 비용': 'costPerConv',
};

function parseNumber(val: string): number {
  if (!val || val === '--' || val === '-' || val === 'N/A') return 0;
  // Strip currency symbols, commas, %, x suffix
  const cleaned = val.replace(/[₩$€,\s]/g, '').replace(/%$/, '').replace(/x$/i, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function mapStatus(val: string): 'Active' | 'Paused' | 'Ended' {
  const lower = val.toLowerCase().trim();
  if (['active', 'enabled', '활성', '게재중', '운영중'].includes(lower)) return 'Active';
  if (['paused', '일시중지', '중지'].includes(lower)) return 'Paused';
  return 'Ended';
}

function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

function splitCSVLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') return line.split('\t').map((s) => s.trim());

  // Handle quoted CSV fields
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function computeDerived(c: Partial<ParsedCampaign>): ParsedCampaign {
  const imp = c.impressions || 0;
  const clk = c.clicks || 0;
  const sp = c.spend || 0;
  const conv = c.conversions || 0;

  return {
    id: c.id || `c-${Math.random().toString(36).slice(2, 8)}`,
    name: c.name || 'Unknown',
    status: c.status || 'Active',
    impressions: imp,
    clicks: clk,
    ctr: c.ctr || (imp > 0 ? +((clk / imp) * 100).toFixed(2) : 0),
    cpc: c.cpc || (clk > 0 ? +(sp / clk).toFixed(0) : 0),
    cpm: c.cpm || (imp > 0 ? +((sp / imp) * 1000).toFixed(0) : 0),
    spend: sp,
    conversions: conv,
    convRate: c.convRate || (clk > 0 ? +((conv / clk) * 100).toFixed(2) : 0),
    roas: c.roas || 0,
    costPerConv: c.costPerConv || (conv > 0 ? +(sp / conv).toFixed(0) : 0),
  } as ParsedCampaign;
}

function parseCSV(raw: string): ParsedCampaign[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/"/g, ''));

  // Map headers to campaign fields
  const fieldMap: (keyof ParsedCampaign | null)[] = headers.map((h) => COLUMN_MAP[h] ?? null);

  const campaigns: ParsedCampaign[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i], delimiter);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const partial: Partial<ParsedCampaign> = { id: `row-${i}` };

    for (let j = 0; j < fieldMap.length; j++) {
      const field = fieldMap[j];
      if (!field || j >= values.length) continue;

      const val = values[j].replace(/^"|"$/g, '');

      if (field === 'name') {
        partial.name = val;
      } else if (field === 'status') {
        partial.status = mapStatus(val);
      } else {
        (partial as Record<string, number>)[field] = parseNumber(val);
      }
    }

    // Skip rows without a name (likely total/summary rows)
    if (partial.name && partial.name !== 'Total' && partial.name !== '합계') {
      campaigns.push(computeDerived(partial));
    }
  }

  return campaigns;
}

function parseJSON(raw: string): ParsedCampaign[] {
  try {
    let data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      // Handle { campaigns: [...] } or { data: [...] } wrappers
      if (data.campaigns) data = data.campaigns;
      else if (data.data) data = data.data;
      else return [];
    }

    return data.map((item: Record<string, unknown>, idx: number) => {
      const partial: Partial<ParsedCampaign> = { id: `json-${idx}` };

      for (const [key, val] of Object.entries(item)) {
        const mapped = COLUMN_MAP[key.toLowerCase()];
        if (!mapped) continue;

        if (mapped === 'name') {
          partial.name = String(val);
        } else if (mapped === 'status') {
          partial.status = mapStatus(String(val));
        } else {
          (partial as Record<string, number>)[mapped] = typeof val === 'number' ? val : parseNumber(String(val));
        }
      }

      return computeDerived(partial);
    });
  } catch {
    return [];
  }
}

interface Props {
  platform: 'google' | 'meta';
  onParsed: (campaigns: ParsedCampaign[]) => void;
  onClear: () => void;
}

export default function DataImporter({ platform, onParsed, onClear }: Props) {
  const [raw, setRaw] = useState('');
  const [format, setFormat] = useState<'csv' | 'json' | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');

  const platformLabel = platform === 'google' ? 'Google Ads' : 'Meta Ads';

  const handleParse = useCallback(() => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setError('');
    let campaigns: ParsedCampaign[];
    let detected: 'csv' | 'json';

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      detected = 'json';
      campaigns = parseJSON(trimmed);
    } else {
      detected = 'csv';
      campaigns = parseCSV(trimmed);
    }

    if (campaigns.length === 0) {
      setError('데이터를 파싱할 수 없습니다. CSV, TSV, 또는 JSON 형식을 확인해주세요.');
      return;
    }

    setFormat(detected);
    setCount(campaigns.length);
    onParsed(campaigns);
  }, [raw, onParsed]);

  const handleClear = () => {
    setRaw('');
    setFormat(null);
    setCount(0);
    setError('');
    onClear();
  };

  const placeholder = platform === 'google'
    ? `Campaign,Status,Impressions,Clicks,CTR,Avg. CPC,Cost,Conversions,Conv. rate,ROAS\n봄 시즌 캠페인,Active,124500,3120,2.51%,₩420,₩1310400,87,2.79%,3.2x\n...`
    : `Campaign name,Status,Impressions,Clicks,CTR,CPC,Amount spent,Results,Cost per result\n인스타 스토리 프로모션,Active,185000,5550,3.00%,₩310,₩1719500,156,₩11022\n...`;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-accent" />
            <h3 className="text-sm font-semibold">{platformLabel} Data Import</h3>
          </div>
          {count > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                {count} campaigns
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted font-medium uppercase">
                {format}
              </span>
            </div>
          )}
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="w-full rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-400/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)] resize-y transition-all"
        />

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={handleParse} disabled={!raw.trim()} size="sm" className="gap-1.5">
            <ClipboardPaste className="size-3.5" />
            Analyze Data
          </Button>
          {(raw || count > 0) && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-muted-foreground">
              <X className="size-3.5" />
              Clear
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground ml-auto">
            CSV, TSV, JSON 지원 | {platformLabel} 대시보드에서 내보낸 데이터를 붙여넣으세요
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
