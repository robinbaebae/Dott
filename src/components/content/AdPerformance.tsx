'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronUp, ChevronDown, Search, RefreshCw, Link2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────

interface Campaign {
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

interface TimeData {
  label: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  roas: number;
  ctr: number;
}

type Platform = 'google' | 'meta';
type Period = 'daily' | 'weekly' | 'monthly';
type ChartMetric = 'spend' | 'conversions' | 'roas' | 'clicks';

// ─── Mock Campaign Data ──────────────────────────────────

const GOOGLE_CAMPAIGNS: Campaign[] = [
  { id: 'g1', name: '봄 시즌 브랜드 캠페인', status: 'Active', impressions: 124500, clicks: 3120, ctr: 2.51, cpc: 420, cpm: 10530, spend: 1310400, conversions: 87, convRate: 2.79, roas: 3.2, costPerConv: 15063 },
  { id: 'g2', name: '신규 고객 리타겟팅', status: 'Active', impressions: 89200, clicks: 2450, ctr: 2.75, cpc: 380, cpm: 10449, spend: 931000, conversions: 64, convRate: 2.61, roas: 2.8, costPerConv: 14547 },
  { id: 'g3', name: '검색 — 핵심 키워드', status: 'Active', impressions: 56800, clicks: 4260, ctr: 7.50, cpc: 520, cpm: 38986, spend: 2215200, conversions: 142, convRate: 3.33, roas: 4.1, costPerConv: 15600 },
  { id: 'g4', name: '디스플레이 — 관심사 타겟', status: 'Paused', impressions: 210000, clicks: 1890, ctr: 0.90, cpc: 280, cpm: 2520, spend: 529200, conversions: 23, convRate: 1.22, roas: 1.5, costPerConv: 23009 },
  { id: 'g5', name: '유튜브 인스트림 광고', status: 'Ended', impressions: 340000, clicks: 5100, ctr: 1.50, cpc: 150, cpm: 2250, spend: 765000, conversions: 51, convRate: 1.00, roas: 2.1, costPerConv: 15000 },
  { id: 'g6', name: 'Performance Max — 전체', status: 'Active', impressions: 478000, clicks: 8604, ctr: 1.80, cpc: 340, cpm: 6120, spend: 2925360, conversions: 203, convRate: 2.36, roas: 3.6, costPerConv: 14411 },
  { id: 'g7', name: '검색 — 경쟁사 키워드', status: 'Active', impressions: 32400, clicks: 1944, ctr: 6.00, cpc: 680, cpm: 40800, spend: 1321920, conversions: 58, convRate: 2.98, roas: 2.4, costPerConv: 22792 },
  { id: 'g8', name: '앱 설치 캠페인', status: 'Paused', impressions: 156000, clicks: 4680, ctr: 3.00, cpc: 250, cpm: 7500, spend: 1170000, conversions: 312, convRate: 6.67, roas: 1.8, costPerConv: 3750 },
  { id: 'g9', name: '쇼핑 — 인기 상품', status: 'Active', impressions: 95600, clicks: 5736, ctr: 6.00, cpc: 390, cpm: 23400, spend: 2237040, conversions: 167, convRate: 2.91, roas: 4.5, costPerConv: 13389 },
  { id: 'g10', name: '디스커버리 — 신규 유입', status: 'Ended', impressions: 267000, clicks: 3738, ctr: 1.40, cpc: 200, cpm: 2800, spend: 747600, conversions: 41, convRate: 1.10, roas: 1.9, costPerConv: 18234 },
];

const META_CAMPAIGNS: Campaign[] = [
  { id: 'm1', name: '인스타 스토리 — 프로모션', status: 'Active', impressions: 185000, clicks: 5550, ctr: 3.00, cpc: 310, cpm: 9297, spend: 1719500, conversions: 156, convRate: 2.81, roas: 3.8, costPerConv: 11022 },
  { id: 'm2', name: '피드 — 신제품 런칭', status: 'Active', impressions: 142000, clicks: 3834, ctr: 2.70, cpc: 350, cpm: 9451, spend: 1341900, conversions: 98, convRate: 2.56, roas: 3.1, costPerConv: 13693 },
  { id: 'm3', name: '릴스 — 브랜드 인지도', status: 'Active', impressions: 520000, clicks: 7800, ctr: 1.50, cpc: 180, cpm: 2700, spend: 1404000, conversions: 72, convRate: 0.92, roas: 2.0, costPerConv: 19500 },
  { id: 'm4', name: '리타겟팅 — 장바구니 이탈', status: 'Paused', impressions: 67000, clicks: 2680, ctr: 4.00, cpc: 290, cpm: 11600, spend: 777200, conversions: 112, convRate: 4.18, roas: 5.2, costPerConv: 6939 },
  { id: 'm5', name: 'Advantage+ 쇼핑', status: 'Active', impressions: 298000, clicks: 6556, ctr: 2.20, cpc: 260, cpm: 5720, spend: 1704560, conversions: 134, convRate: 2.04, roas: 3.5, costPerConv: 12720 },
  { id: 'm6', name: '페이스북 피드 — 시즌 세일', status: 'Active', impressions: 231000, clicks: 6468, ctr: 2.80, cpc: 270, cpm: 7560, spend: 1746360, conversions: 189, convRate: 2.92, roas: 4.1, costPerConv: 9240 },
  { id: 'm7', name: '인스타 탐색탭 광고', status: 'Active', impressions: 412000, clicks: 8240, ctr: 2.00, cpc: 220, cpm: 4400, spend: 1812800, conversions: 95, convRate: 1.15, roas: 2.3, costPerConv: 19082 },
  { id: 'm8', name: '메신저 — 문의 유도', status: 'Paused', impressions: 54000, clicks: 2160, ctr: 4.00, cpc: 350, cpm: 14000, spend: 756000, conversions: 78, convRate: 3.61, roas: 3.9, costPerConv: 9692 },
  { id: 'm9', name: '룩어라이크 — 고가치 고객', status: 'Active', impressions: 167000, clicks: 5010, ctr: 3.00, cpc: 300, cpm: 9000, spend: 1503000, conversions: 121, convRate: 2.42, roas: 3.7, costPerConv: 12421 },
  { id: 'm10', name: '다이나믹 리타겟팅 — 상품뷰', status: 'Ended', impressions: 89000, clicks: 3560, ctr: 4.00, cpc: 240, cpm: 9600, spend: 854400, conversions: 145, convRate: 4.07, roas: 5.8, costPerConv: 5893 },
];

// ─── Mock Time Series Data ───────────────────────────────

function generateDailyData(platform: Platform): TimeData[] {
  const base = platform === 'google'
    ? { spend: 180000, conv: 18, clicks: 520, imp: 18000, roas: 3.0 }
    : { spend: 220000, conv: 22, clicks: 680, imp: 24000, roas: 3.2 };

  const days: TimeData[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const variance = 0.7 + Math.random() * 0.6;
    const weekendDip = (d.getDay() === 0 || d.getDay() === 6) ? 0.65 : 1;
    const trend = 1 + (14 - i) * 0.015;
    const m = variance * weekendDip * trend;
    const spend = Math.round(base.spend * m);
    const conversions = Math.round(base.conv * m);
    const clicks = Math.round(base.clicks * m);
    const impressions = Math.round(base.imp * m);
    days.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      spend,
      conversions,
      clicks,
      impressions,
      roas: +(base.roas * (0.8 + Math.random() * 0.4)).toFixed(1),
      ctr: +((clicks / impressions) * 100).toFixed(2),
    });
  }
  return days;
}

function generateWeeklyData(platform: Platform): TimeData[] {
  const base = platform === 'google'
    ? { spend: 1200000, conv: 120, clicks: 3500, imp: 120000, roas: 3.1 }
    : { spend: 1500000, conv: 150, clicks: 4500, imp: 160000, roas: 3.3 };

  const weeks: TimeData[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const variance = 0.8 + Math.random() * 0.4;
    const trend = 1 + (8 - i) * 0.03;
    const m = variance * trend;
    const spend = Math.round(base.spend * m);
    const conversions = Math.round(base.conv * m);
    const clicks = Math.round(base.clicks * m);
    const impressions = Math.round(base.imp * m);
    weeks.push({
      label: `${d.getMonth() + 1}/${d.getDate()}~${end.getMonth() + 1}/${end.getDate()}`,
      spend,
      conversions,
      clicks,
      impressions,
      roas: +(base.roas * (0.85 + Math.random() * 0.3)).toFixed(1),
      ctr: +((clicks / impressions) * 100).toFixed(2),
    });
  }
  return weeks;
}

function generateMonthlyData(platform: Platform): TimeData[] {
  const base = platform === 'google'
    ? { spend: 5200000, conv: 480, clicks: 14000, imp: 500000, roas: 3.0 }
    : { spend: 6400000, conv: 580, clicks: 18000, imp: 650000, roas: 3.2 };

  const months: TimeData[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const variance = 0.85 + Math.random() * 0.3;
    const trend = 1 + (6 - i) * 0.04;
    const m = variance * trend;
    const spend = Math.round(base.spend * m);
    const conversions = Math.round(base.conv * m);
    const clicks = Math.round(base.clicks * m);
    const impressions = Math.round(base.imp * m);
    months.push({
      label: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
      spend,
      conversions,
      clicks,
      impressions,
      roas: +(base.roas * (0.85 + Math.random() * 0.3)).toFixed(1),
      ctr: +((clicks / impressions) * 100).toFixed(2),
    });
  }
  return months;
}

// ─── Helpers ─────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Active: 'text-green-600 bg-green-500/10',
  Paused: 'text-yellow-600 bg-yellow-500/10',
  Ended: 'text-gray-500 bg-gray-500/10',
};

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

function fmtWon(n: number): string {
  if (n >= 1000000) return `₩${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₩${(n / 1000).toFixed(0)}K`;
  return `₩${n}`;
}

const CHART_METRICS: { key: ChartMetric; label: string; color: string }[] = [
  { key: 'spend', label: 'Spend', color: '#6B5B7B' },
  { key: 'conversions', label: 'Conversions', color: '#10B981' },
  { key: 'roas', label: 'ROAS', color: '#6366F1' },
  { key: 'clicks', label: 'Clicks', color: '#F59E0B' },
];

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

// ─── Sub Components ──────────────────────────────────────

function WeeklySummary({ platform, timeData }: { platform: Platform; timeData?: TimeData[] }) {
  const data = timeData ? timeData.slice(-7) : generateDailyData(platform).slice(-7);
  const totalSpend = data.reduce((s, d) => s + d.spend, 0);
  const totalConv = data.reduce((s, d) => s + d.conversions, 0);
  const totalClicks = data.reduce((s, d) => s + d.clicks, 0);
  const totalImp = data.reduce((s, d) => s + d.impressions, 0);
  const avgRoas = data.reduce((s, d) => s + d.roas, 0) / data.length;
  const avgCtr = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;
  const name = platform === 'google' ? 'Google Ads' : 'Meta Ads';

  const bestDay = [...data].sort((a, b) => b.conversions - a.conversions)[0];
  const worstDay = [...data].sort((a, b) => a.roas - b.roas)[0];

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4 text-sm text-muted-foreground leading-relaxed">
      <p>
        최근 7일간 <span className="text-foreground font-medium">{name}</span> 총 광고비{' '}
        <span className="text-foreground font-medium">{fmtWon(totalSpend)}</span>, 전환{' '}
        <span className="text-foreground font-medium">{fmt(totalConv)}건</span>, 평균 ROAS{' '}
        <span className="text-foreground font-medium">{avgRoas.toFixed(1)}x</span>를 기록했습니다.
        클릭수 <span className="text-foreground font-medium">{fmt(totalClicks)}</span>회, 평균 CTR{' '}
        <span className="text-foreground font-medium">{avgCtr.toFixed(2)}%</span>입니다.
      </p>
      <p className="mt-1">
        전환이 가장 높았던 날은 <span className="text-foreground font-medium">{bestDay.label}</span> ({bestDay.conversions}건),
        ROAS가 가장 낮았던 날은 <span className="text-foreground font-medium">{worstDay.label}</span> ({worstDay.roas}x)입니다.
        {avgRoas >= 3.0
          ? ' 전반적으로 양호한 광고 성과를 보이고 있습니다.'
          : ' ROAS 개선을 위한 캠페인 최적화를 권장합니다.'}
      </p>
    </div>
  );
}

function SummaryCards({ campaigns }: { campaigns: Campaign[] }) {
  const active = campaigns.filter((c) => c.status === 'Active');
  const totalSpend = active.reduce((s, c) => s + c.spend, 0);
  const totalConversions = active.reduce((s, c) => s + c.conversions, 0);
  const totalClicks = active.reduce((s, c) => s + c.clicks, 0);
  const totalImpressions = active.reduce((s, c) => s + c.impressions, 0);
  const avgRoas = active.length > 0 ? active.reduce((s, c) => s + c.roas, 0) / active.length : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const stats = [
    { label: 'Active', value: `${active.length}/${campaigns.length}` },
    { label: 'Spend', value: fmtWon(totalSpend) },
    { label: 'Conversions', value: fmt(totalConversions) },
    { label: 'Avg ROAS', value: `${avgRoas.toFixed(1)}x` },
    { label: 'Avg CTR', value: `${avgCtr.toFixed(2)}%` },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          <p className="text-lg font-semibold mt-0.5">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function PerformanceCharts({
  platform,
  period,
  timeData,
}: {
  platform: Platform;
  period: Period;
  timeData?: TimeData[];
}) {
  const [metric, setMetric] = useState<ChartMetric>('spend');

  const data = timeData ??
    (period === 'daily'
      ? generateDailyData(platform)
      : period === 'weekly'
        ? generateWeeklyData(platform)
        : generateMonthlyData(platform));

  const activeMetric = CHART_METRICS.find((m) => m.key === metric)!;

  const formatValue = (v: number) => {
    if (metric === 'spend') return fmtWon(v);
    if (metric === 'roas') return `${v}x`;
    return fmt(v);
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Metric selector */}
      <div className="flex gap-1">
        {CHART_METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              metric === m.key
                ? 'text-white'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            style={metric === m.key ? { backgroundColor: m.color } : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Main chart - Area for spend, Bar for conversions/clicks, Line for ROAS */}
      <div className="rounded-lg border border-border p-4">
        <ResponsiveContainer width="100%" height={260}>
          {metric === 'roas' ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: unknown) => [formatValue(Number(v) || 0), activeMetric.label]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={activeMetric.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: activeMetric.color }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : metric === 'conversions' || metric === 'clicks' ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: unknown) => [formatValue(Number(v) || 0), activeMetric.label]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }}
              />
              <Bar dataKey={metric} fill={activeMetric.color} radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeMetric.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: unknown) => [formatValue(Number(v) || 0), activeMetric.label]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={activeMetric.color}
                strokeWidth={2}
                fill="url(#spendGrad)"
                dot={{ r: 3, fill: activeMetric.color }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Comparison: Google vs Meta side-by-side mini chart */}
      <div className="grid grid-cols-2 gap-3">
        <MiniChart
          data={generateDailyData('google').slice(-7)}
          metric={metric}
          label="Google Ads"
          color="#4285F4"
          formatValue={formatValue}
          active={platform === 'google'}
        />
        <MiniChart
          data={generateDailyData('meta').slice(-7)}
          metric={metric}
          label="Meta Ads"
          color="#0668E1"
          formatValue={formatValue}
          active={platform === 'meta'}
        />
      </div>
    </div>
  );
}

function MiniChart({
  data,
  metric,
  label,
  color,
  formatValue,
  active,
}: {
  data: TimeData[];
  metric: ChartMetric;
  label: string;
  color: string;
  formatValue: (v: number) => string;
  active: boolean;
}) {
  const total = data.reduce((s, d) => s + (d[metric] as number), 0);
  const avg = metric === 'roas' ? total / data.length : total;

  return (
    <div className={`rounded-lg border p-3 ${active ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          7d: {metric === 'roas' ? `${avg.toFixed(1)}x avg` : formatValue(avg)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={`mini-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#mini-${label})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type SortKey = keyof Campaign;
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'Active' | 'Paused' | 'Ended';

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Campaign', align: 'left' },
  { key: 'status', label: 'Status', align: 'left' },
  { key: 'impressions', label: 'Impressions', align: 'right' },
  { key: 'clicks', label: 'Clicks', align: 'right' },
  { key: 'ctr', label: 'CTR', align: 'right' },
  { key: 'cpc', label: 'CPC', align: 'right' },
  { key: 'cpm', label: 'CPM', align: 'right' },
  { key: 'spend', label: 'Spend', align: 'right' },
  { key: 'conversions', label: 'Conv.', align: 'right' },
  { key: 'convRate', label: 'Conv.Rate', align: 'right' },
  { key: 'roas', label: 'ROAS', align: 'right' },
  { key: 'costPerConv', label: 'Cost/Conv', align: 'right' },
];

function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [campaigns, statusFilter, search, sortKey, sortDir]);

  const statusCounts = {
    all: campaigns.length,
    Active: campaigns.filter((c) => c.status === 'Active').length,
    Paused: campaigns.filter((c) => c.status === 'Paused').length,
    Ended: campaigns.filter((c) => c.status === 'Ended').length,
  };

  const renderCell = (c: Campaign, key: SortKey) => {
    switch (key) {
      case 'name': return <span className="truncate block max-w-[180px]">{c.name}</span>;
      case 'status': return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>{c.status}</span>;
      case 'impressions': return fmt(c.impressions);
      case 'clicks': return fmt(c.clicks);
      case 'ctr': return `${c.ctr.toFixed(2)}%`;
      case 'cpc': return fmtWon(c.cpc);
      case 'cpm': return fmtWon(c.cpm);
      case 'spend': return <span className="font-medium">{fmtWon(c.spend)}</span>;
      case 'conversions': return c.conversions;
      case 'convRate': return `${c.convRate.toFixed(2)}%`;
      case 'roas': return <span className="font-medium">{c.roas.toFixed(1)}x</span>;
      case 'costPerConv': return fmtWon(c.costPerConv);
      default: return '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        {/* Status filter */}
        <div className="flex gap-1">
          {(['all', 'Active', 'Paused', 'Ended'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                statusFilter === s
                  ? s === 'all' ? 'bg-muted text-foreground font-medium' : `${STATUS_STYLE[s]} font-medium`
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {s === 'all' ? 'All' : s} ({statusCounts[s]})
            </button>
          ))}
        </div>
        {/* Result count */}
        <span className="text-[11px] text-muted-foreground ml-auto">
          {filtered.length} campaigns
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`py-2 px-1.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${
                    col.align === 'left' ? 'text-left' : 'text-right'
                  } ${col.key === 'name' ? 'px-2' : ''} ${col.key === 'costPerConv' ? 'pr-2' : ''}`}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="size-3" />
                        : <ChevronDown className="size-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-8 text-center text-muted-foreground">
                  No campaigns found
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`py-2.5 px-1.5 tabular-nums ${
                        col.align === 'left' ? 'text-left' : 'text-right'
                      } ${col.key === 'name' ? 'px-2 font-medium' : ''} ${col.key === 'costPerConv' ? 'pr-2' : ''}`}
                    >
                      {renderCell(c, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function AdPerformance() {
  const [platform, setPlatform] = useState<Platform>('google');
  const [period, setPeriod] = useState<Period>('daily');
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaCampaigns, setMetaCampaigns] = useState<Campaign[]>([]);
  const [metaTimeData, setMetaTimeData] = useState<Record<Period, TimeData[]>>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetaData = useCallback(async (refresh = false) => {
    try {
      const [campaignsRes, dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch(`/api/meta-ads/campaigns${refresh ? '?refresh=true' : ''}`),
        fetch(`/api/meta-ads/insights?period=daily${refresh ? '&refresh=true' : ''}`),
        fetch(`/api/meta-ads/insights?period=weekly${refresh ? '&refresh=true' : ''}`),
        fetch(`/api/meta-ads/insights?period=monthly${refresh ? '&refresh=true' : ''}`),
      ]);

      const [campaignsData, dailyData, weeklyData, monthlyData] = await Promise.all([
        campaignsRes.json(),
        dailyRes.json(),
        weeklyRes.json(),
        monthlyRes.json(),
      ]);

      if (campaignsData.campaigns) setMetaCampaigns(campaignsData.campaigns);
      setMetaTimeData({
        daily: dailyData.data ?? [],
        weekly: weeklyData.data ?? [],
        monthly: monthlyData.data ?? [],
      });
    } catch (error) {
      console.error('Failed to fetch Meta ads data:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch('/api/meta-ads/status');
        const data = await res.json();
        if (cancelled) return;

        setMetaConnected(data.connected);
        if (data.connected) {
          setIsLoading(true);
          await fetchMetaData();
          if (!cancelled) setIsLoading(false);
        }
      } catch {
        // ignore — status check failed
      }
    }

    checkStatus();
    return () => { cancelled = true; };
  }, [fetchMetaData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetaData(true);
    setRefreshing(false);
  };

  const isMetaLive = platform === 'meta' && metaConnected;
  const campaigns = platform === 'google'
    ? GOOGLE_CAMPAIGNS
    : metaConnected && metaCampaigns.length > 0
      ? metaCampaigns
      : META_CAMPAIGNS;

  const currentTimeData = isMetaLive && metaTimeData[period].length > 0
    ? metaTimeData[period]
    : undefined;

  const badgeLabel = platform === 'meta' && metaConnected ? 'Live' : 'Mock';
  const badgeStyle = platform === 'meta' && metaConnected
    ? 'text-green-600 bg-green-500/10'
    : 'text-muted-foreground bg-muted';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Ad Performance</CardTitle>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeStyle}`}>{badgeLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh button (Meta connected only) */}
            {isMetaLive && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                title="Refresh Meta data"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            {/* Period selector */}
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                    period === p.key
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Platform selector */}
            <div className="flex gap-1">
              <button
                onClick={() => setPlatform('google')}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  platform === 'google'
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Google Ads
              </button>
              <button
                onClick={() => setPlatform('meta')}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  platform === 'meta'
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                Meta Ads
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Connect Meta Ads prompt */}
        {platform === 'meta' && !metaConnected && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 mb-4 text-center">
            <Link2 className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">Connect Meta Ads</p>
            <p className="text-xs text-muted-foreground mb-3">
              Link your Meta ad account to see real campaign performance data.
            </p>
            <a
              href="/api/instagram/auth"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Connect Meta Ads
            </a>
            <p className="text-[10px] text-muted-foreground mt-3">
              Showing mock data below. Connect to replace with live data.
            </p>
          </div>
        )}

        {/* Loading state */}
        {platform === 'meta' && metaConnected && isLoading && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4 text-center text-sm text-muted-foreground">
            Loading Meta Ads data...
          </div>
        )}

        <WeeklySummary platform={platform} timeData={currentTimeData} />
        <SummaryCards campaigns={campaigns} />
        <PerformanceCharts platform={platform} period={period} timeData={currentTimeData} />
        <CampaignTable campaigns={campaigns} />
      </CardContent>
    </Card>
  );
}
