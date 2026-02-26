'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shuffle,
  Calculator,
  Copy,
  Check,
  Plus,
  X,
  RotateCcw,
} from 'lucide-react';

/* ============================================
   Tab 1: Keyword Combiner (키워드 조합기)
   ============================================ */

function KeywordCombiner() {
  const [groups, setGroups] = useState<string[]>(['', '']);
  const [separator, setSeparator] = useState(' ');
  const [results, setResults] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const addGroup = () => setGroups([...groups, '']);
  const removeGroup = (i: number) => {
    if (groups.length <= 2) return;
    setGroups(groups.filter((_, idx) => idx !== i));
  };
  const updateGroup = (i: number, val: string) => {
    const next = [...groups];
    next[i] = val;
    setGroups(next);
  };

  const combine = () => {
    const parsed = groups.map((g) =>
      g
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    );

    // Cartesian product
    const cartesian = (arrays: string[][]): string[][] => {
      if (arrays.length === 0) return [[]];
      const [first, ...rest] = arrays;
      const restProduct = cartesian(rest);
      return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
    };

    const nonEmpty = parsed.filter((arr) => arr.length > 0);
    if (nonEmpty.length === 0) {
      setResults([]);
      return;
    }

    const combos = cartesian(nonEmpty);
    setResults(combos.map((combo) => combo.join(separator)));
  };

  const copyAll = () => {
    navigator.clipboard.writeText(results.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        키워드 그룹을 입력하면 모든 조합을 생성합니다. 각 그룹 내 키워드는 줄바꿈 또는 쉼표로 구분하세요.
      </p>

      {groups.map((g, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-muted-foreground">그룹 {i + 1}</label>
            {groups.length > 2 && (
              <button onClick={() => removeGroup(i)} className="p-0.5 rounded hover:bg-muted/50 cursor-pointer">
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder={i === 0 ? '서울, 부산, 대구' : i === 1 ? '맛집, 카페, 관광' : '키워드 입력...'}
            value={g}
            onChange={(e) => updateGroup(i, e.target.value)}
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={addGroup}
          className="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
        >
          <Plus className="size-3" />
          그룹 추가
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <label className="text-[11px] text-muted-foreground">구분자</label>
          <select
            className="text-xs px-2 py-1 rounded border border-border bg-card cursor-pointer"
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
          >
            <option value=" ">공백</option>
            <option value="_">밑줄 (_)</option>
            <option value="-">하이픈 (-)</option>
            <option value="+">플러스 (+)</option>
            <option value="">없음</option>
          </select>
        </div>
      </div>

      <button
        onClick={combine}
        className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
      >
        <Shuffle className="size-3.5" />
        조합 생성
      </button>

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              총 <span className="font-medium text-foreground">{results.length}</span>개 조합
            </p>
            <button
              onClick={copyAll}
              className="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? '복사됨!' : '전체 복사'}
            </button>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 max-h-60 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {results.map((r, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded bg-card border border-border/50 text-foreground cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => navigator.clipboard.writeText(r)}
                  title="클릭하여 복사"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================
   Tab 2: Ad Performance Calculator (광고 성과 계산기)
   ============================================ */

function AdCalculator() {
  const [mode, setMode] = useState<'basic' | 'roas' | 'cpm'>('basic');

  // Basic mode
  const [spend, setSpend] = useState('');
  const [impressions, setImpressions] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');
  const [revenue, setRevenue] = useState('');

  const reset = () => {
    setSpend('');
    setImpressions('');
    setClicks('');
    setConversions('');
    setRevenue('');
  };

  const n = (v: string) => parseFloat(v) || 0;
  const fmt = (v: number, d = 2) => (isNaN(v) || !isFinite(v) ? '-' : v.toLocaleString('ko-KR', { maximumFractionDigits: d }));

  const spendN = n(spend);
  const impressionsN = n(impressions);
  const clicksN = n(clicks);
  const conversionsN = n(conversions);
  const revenueN = n(revenue);

  const ctr = impressionsN > 0 ? (clicksN / impressionsN) * 100 : 0;
  const cpc = clicksN > 0 ? spendN / clicksN : 0;
  const cpm = impressionsN > 0 ? (spendN / impressionsN) * 1000 : 0;
  const cpa = conversionsN > 0 ? spendN / conversionsN : 0;
  const cvr = clicksN > 0 ? (conversionsN / clicksN) * 100 : 0;
  const roas = spendN > 0 ? (revenueN / spendN) * 100 : 0;

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';

  const ResultCard = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <div className="bg-muted/30 rounded-lg p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold tabular-nums">
        {value}
        <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </div>
  );

  const modes = [
    { key: 'basic' as const, label: '기본 성과' },
    { key: 'roas' as const, label: 'ROAS 계산' },
    { key: 'cpm' as const, label: 'CPM/CPC 역산' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        광고 지표를 입력하면 주요 성과 지표를 자동 계산합니다.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-1.5">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              mode === m.key
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={reset}
          className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <RotateCcw className="size-3" />
          초기화
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">광고비 (원)</label>
          <input
            type="number"
            className={inputClass}
            placeholder="1,000,000"
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">노출수</label>
          <input
            type="number"
            className={inputClass}
            placeholder="100,000"
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">클릭수</label>
          <input
            type="number"
            className={inputClass}
            placeholder="2,000"
            value={clicks}
            onChange={(e) => setClicks(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">전환수</label>
          <input
            type="number"
            className={inputClass}
            placeholder="50"
            value={conversions}
            onChange={(e) => setConversions(e.target.value)}
          />
        </div>
        {(mode === 'basic' || mode === 'roas') && (
          <div className="col-span-2">
            <label className="text-[11px] text-muted-foreground mb-1 block">매출액 (원)</label>
            <input
              type="number"
              className={inputClass}
              placeholder="5,000,000"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-2">
        <ResultCard label="CTR (클릭률)" value={fmt(ctr)} unit="%" />
        <ResultCard label="CPC (클릭당 비용)" value={fmt(cpc, 0)} unit="원" />
        <ResultCard label="CPM (1천 노출 비용)" value={fmt(cpm, 0)} unit="원" />
        <ResultCard label="CPA (전환당 비용)" value={fmt(cpa, 0)} unit="원" />
        <ResultCard label="CVR (전환율)" value={fmt(cvr)} unit="%" />
        <ResultCard label="ROAS (광고수익률)" value={fmt(roas, 0)} unit="%" />
      </div>

      {/* ROAS interpretation */}
      {roas > 0 && (
        <div
          className={`text-xs px-3 py-2 rounded-lg ${
            roas >= 300
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : roas >= 100
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {roas >= 300
            ? `ROAS ${fmt(roas, 0)}% — 우수한 광고 효율입니다.`
            : roas >= 100
            ? `ROAS ${fmt(roas, 0)}% — 손익분기점 이상이지만 개선 여지가 있습니다.`
            : `ROAS ${fmt(roas, 0)}% — 광고비 대비 매출이 부족합니다. 타겟이나 소재 점검이 필요합니다.`}
        </div>
      )}
    </div>
  );
}

/* ============================================
   Main Tools Page
   ============================================ */

const TABS = [
  { key: 'keyword', label: '키워드 조합기', icon: Shuffle },
  { key: 'calculator', label: '광고 성과 계산기', icon: Calculator },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function ToolsPage() {
  const { status } = useSession();
  const [tab, setTab] = useState<TabKey>('keyword');

  if (status !== 'authenticated') {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        로그인이 필요합니다.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                tab === t.key
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-5">
          {tab === 'keyword' && <KeywordCombiner />}
          {tab === 'calculator' && <AdCalculator />}
        </CardContent>
      </Card>
    </div>
  );
}
