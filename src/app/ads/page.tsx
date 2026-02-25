'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronUp, ChevronDown, Upload, FileSpreadsheet, BarChart3,
  Sparkles, Trash2, Calendar, X,
} from 'lucide-react';

// ─── Recharts (dynamic for Electron) ────────────────────
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then((m) => m.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const LineChart = dynamic(() => import('recharts').then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then((m) => m.Cell), { ssr: false });
const ScatterChart = dynamic(() => import('recharts').then((m) => m.ScatterChart), { ssr: false });
const Scatter = dynamic(() => import('recharts').then((m) => m.Scatter), { ssr: false });
const ZAxis = dynamic(() => import('recharts').then((m) => m.ZAxis), { ssr: false });
const Legend = dynamic(() => import('recharts').then((m) => m.Legend), { ssr: false });

// ─── Types ───────────────────────────────────────────────

interface CsvRow {
  date: string;
  campaign: string;
  adSet: string;
  creative: string;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  ctrAll: number;
  ctrLink: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  convValue: number;
  roas: number;
}

interface UploadRecord {
  fileName: string;
  uploadedAt: string;
  rowCount: number;
}

interface StoredAdData {
  version: 1;
  meta: { rows: CsvRow[]; uploads: UploadRecord[] };
  google: { rows: CsvRow[]; uploads: UploadRecord[] };
}

interface DailyData { date: string; spend: number; ctr: number; conversions: number; roas: number; }
interface CreativeData { creative: string; impressions: number; clicks: number; ctr: number; spend: number; conversions: number; roas: number; }

type Platform = 'meta' | 'google';
type ChartMetric = 'spend' | 'ctr' | 'conversions' | 'roas';
type SortKey = keyof CreativeData;
type SortDir = 'asc' | 'desc';

// ─── Constants ───────────────────────────────────────────

const CACHE_KEY = 'dott_ad_analytics';

const CHART_METRICS: { key: ChartMetric; label: string; color: string }[] = [
  { key: 'spend', label: '지출금액', color: '#8B5CF6' },
  { key: 'ctr', label: 'CTR', color: '#F59E0B' },
  { key: 'conversions', label: '전환수', color: '#10B981' },
  { key: 'roas', label: 'ROAS', color: '#EC4899' },
];

const BAR_METRICS: { key: 'ctr' | 'spend' | 'conversions'; label: string; color: string }[] = [
  { key: 'ctr', label: 'CTR (%)', color: '#F59E0B' },
  { key: 'spend', label: '지출 (₩)', color: '#8B5CF6' },
  { key: 'conversions', label: '전환수', color: '#10B981' },
];

const PIE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#E11D48', '#0EA5E9'];

const DATE_PRESETS = [
  { label: '전체', days: 0 },
  { label: '최근 7일', days: 7 },
  { label: '최근 14일', days: 14 },
  { label: '최근 30일', days: 30 },
];

// ─── Helpers ─────────────────────────────────────────────

function parseNum(s: string): number {
  const cleaned = s.replace(/,/g, '').replace(/%/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function fmt(n: number): string { return n.toLocaleString('ko-KR'); }

function fmtWon(n: number): string {
  if (n >= 1_000_000) return `₩${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₩${(n / 1_000).toFixed(0)}K`;
  return `₩${Math.round(n)}`;
}

function rowKey(r: CsvRow): string {
  return `${r.date}|${r.campaign}|${r.adSet}|${r.creative}`;
}

function mergeRows(existing: CsvRow[], incoming: CsvRow[]): CsvRow[] {
  const map = new Map<string, CsvRow>();
  for (const r of existing) map.set(rowKey(r), r);
  for (const r of incoming) map.set(rowKey(r), r);
  return Array.from(map.values());
}

function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { fields.push(current); current = ''; }
      else { current += ch; }
    }
    fields.push(current);
    if (fields.length < 17) continue;
    rows.push({
      date: fields[0].trim(), campaign: fields[1].trim(), adSet: fields[2].trim(), creative: fields[3].trim(),
      impressions: parseNum(fields[4]), reach: parseNum(fields[5]), frequency: parseNum(fields[6]),
      clicks: parseNum(fields[7]), linkClicks: parseNum(fields[8]), ctrAll: parseNum(fields[9]),
      ctrLink: parseNum(fields[10]), cpc: parseNum(fields[11]), cpm: parseNum(fields[12]),
      spend: parseNum(fields[13]), conversions: parseNum(fields[14]), convValue: parseNum(fields[15]),
      roas: parseNum(fields[16]),
    });
  }
  return rows;
}

function renderMarkdown(text: string): string {
  let html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-2">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet points
    .replace(/^[-•] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>');

  // Markdown tables
  const tableRegex = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (_match, headerRow: string, bodyRows: string) => {
    const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
    const rows = bodyRows.trim().split('\n').map((row: string) =>
      row.split('|').map((c: string) => c.trim()).filter(Boolean)
    );
    const th = headers.map((h: string) => `<th class="px-3 py-1.5 text-left text-[11px] font-medium text-muted-foreground border-b border-border">${h}</th>`).join('');
    const tbody = rows.map((cols: string[]) =>
      '<tr class="border-b border-border/50 hover:bg-muted/20">' +
      cols.map((c: string) => `<td class="px-3 py-1.5 text-xs tabular-nums">${c}</td>`).join('') +
      '</tr>'
    ).join('');
    return `<div class="overflow-x-auto my-3"><table class="w-full border-collapse"><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table></div>`;
  });

  return html;
}

function buildAiContext(rows: CsvRow[], platform: string): string {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const campaigns = [...new Set(rows.map((r) => r.campaign))];
  const creatives = [...new Set(rows.map((r) => r.creative))];
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalConv = rows.reduce((s, r) => s + r.conversions, 0);
  const totalConvVal = rows.reduce((s, r) => s + r.convValue, 0);
  const totalImp = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const lines = [
    `Platform: ${platform === 'google' ? 'Google Ads' : 'Meta Ads'}`,
    `Period: ${dates[0]} ~ ${dates[dates.length - 1]} (${dates.length}일)`,
    `Campaigns: ${campaigns.join(', ')}`,
    `Total: Spend ₩${fmt(totalSpend)} | Imp ${fmt(totalImp)} | Clicks ${fmt(totalClicks)} | Conv ${fmt(totalConv)} | ROAS ${totalSpend > 0 ? (totalConvVal / totalSpend).toFixed(2) : 0}x`,
    '', '--- Creative Summary ---',
  ];
  const cMap = new Map<string, { spend: number; conv: number; convVal: number; imp: number; clicks: number }>();
  for (const r of rows) {
    const e = cMap.get(r.creative) ?? { spend: 0, conv: 0, convVal: 0, imp: 0, clicks: 0 };
    e.spend += r.spend; e.conv += r.conversions; e.convVal += r.convValue; e.imp += r.impressions; e.clicks += r.clicks;
    cMap.set(r.creative, e);
  }
  for (const [name, d] of cMap) {
    const ctr = d.imp > 0 ? ((d.clicks / d.imp) * 100).toFixed(2) : '0';
    const roas = d.spend > 0 ? (d.convVal / d.spend).toFixed(2) : '0';
    lines.push(`${name}: Spend ₩${fmt(d.spend)} | CTR ${ctr}% | Conv ${d.conv} | ROAS ${roas}x`);
  }
  return lines.join('\n');
}

// ─── Sub Components ──────────────────────────────────────

function SummaryCards({ rows }: { rows: CsvRow[] }) {
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalImp = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const avgCtr = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;
  const totalConv = rows.reduce((s, r) => s + r.conversions, 0);
  const totalConvVal = rows.reduce((s, r) => s + r.convValue, 0);
  const avgRoas = totalSpend > 0 ? totalConvVal / totalSpend : 0;
  const stats = [
    { label: '총 지출', value: fmtWon(totalSpend) },
    { label: '총 노출', value: fmt(totalImp) },
    { label: '평균 CTR', value: `${avgCtr.toFixed(2)}%` },
    { label: '총 전환', value: fmt(totalConv) },
    { label: '평균 ROAS', value: `${avgRoas.toFixed(2)}x` },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          <p className="text-lg font-semibold mt-1">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function DailyChart({ dailyData }: { dailyData: DailyData[] }) {
  const [metric, setMetric] = useState<ChartMetric>('spend');
  const am = CHART_METRICS.find((m) => m.key === metric)!;
  const fv = (v: number) => {
    if (metric === 'spend') return fmtWon(v);
    if (metric === 'roas') return `${v.toFixed(2)}x`;
    if (metric === 'ctr') return `${v.toFixed(2)}%`;
    return fmt(v);
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">일별 추이</CardTitle>
          <div className="flex gap-1">
            {CHART_METRICS.map((m) => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${metric === m.key ? 'text-white' : 'text-muted-foreground hover:bg-muted'}`}
                style={metric === m.key ? { backgroundColor: m.color } : undefined}>{m.label}</button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          {metric === 'roas' || metric === 'ctr' ? (
            <LineChart data={dailyData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: unknown) => [fv(Number(v) || 0), am.label]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }} />
              <Line type="monotone" dataKey={metric} stroke={am.color} strokeWidth={2.5} dot={{ r: 4, fill: am.color }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : metric === 'conversions' ? (
            <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: unknown) => [fv(Number(v) || 0), am.label]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }} />
              <Bar dataKey={metric} fill={am.color} radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          ) : (
            <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs><linearGradient id="csvSpendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={am.color} stopOpacity={0.3} /><stop offset="95%" stopColor={am.color} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: unknown) => [fv(Number(v) || 0), am.label]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }} />
              <Area type="monotone" dataKey={metric} stroke={am.color} strokeWidth={2} fill="url(#csvSpendGrad)" dot={{ r: 3, fill: am.color }} activeDot={{ r: 5 }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CampaignPieChart({ rows }: { rows: CsvRow[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.campaign, (map.get(r.campaign) ?? 0) + r.spend);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">캠페인 지출 분포</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').slice(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: unknown) => [fmtWon(Number(v) || 0), '지출']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function SpendRoasScatter({ creatives }: { creatives: CreativeData[] }) {
  if (creatives.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">지출 vs ROAS (소재별)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
            <XAxis type="number" dataKey="spend" name="지출" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtWon(v)} />
            <YAxis type="number" dataKey="roas" name="ROAS" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}x`} />
            <ZAxis type="number" dataKey="conversions" range={[40, 400]} name="전환" />
            <Tooltip formatter={(v: unknown, name: unknown) => [String(name) === '지출' ? fmtWon(Number(v) || 0) : String(name) === 'ROAS' ? `${Number(v).toFixed(2)}x` : fmt(Number(v) || 0), String(name ?? '')]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend />
            <Scatter name="소재" data={creatives} fill="#6B5B7B" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CreativeBarChart({ creatives }: { creatives: CreativeData[] }) {
  const [barMetric, setBarMetric] = useState<'ctr' | 'spend' | 'conversions'>('ctr');
  const active = BAR_METRICS.find((m) => m.key === barMetric)!;
  const fv = (v: number) => { if (barMetric === 'spend') return fmtWon(v); if (barMetric === 'ctr') return `${v.toFixed(2)}%`; return fmt(v); };
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">소재별 성과 비교</CardTitle>
          <div className="flex gap-1">
            {BAR_METRICS.map((m) => (
              <button key={m.key} onClick={() => setBarMetric(m.key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${barMetric === m.key ? 'text-white' : 'text-muted-foreground hover:bg-muted'}`}
                style={barMetric === m.key ? { backgroundColor: m.color } : undefined}>{m.label}</button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, creatives.length * 48)}>
          <BarChart data={creatives} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="creative" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
            <Tooltip formatter={(v: unknown) => [fv(Number(v) || 0), active.label]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }} />
            <Bar dataKey={barMetric} fill={active.color} radius={[0, 4, 4, 0]} opacity={0.85} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CreativeTable({ creatives }: { creatives: CreativeData[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const handleSort = (key: SortKey) => { if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc'); } };
  const sorted = useMemo(() => {
    const list = [...creatives];
    list.sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number); });
    return list;
  }, [creatives, sortKey, sortDir]);
  const COLS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'creative', label: '소재명', align: 'left' }, { key: 'impressions', label: '총 노출', align: 'right' },
    { key: 'clicks', label: '총 클릭', align: 'right' }, { key: 'ctr', label: '평균 CTR', align: 'right' },
    { key: 'spend', label: '총 지출', align: 'right' }, { key: 'conversions', label: '총 전환', align: 'right' },
    { key: 'roas', label: '평균 ROAS', align: 'right' },
  ];
  const cell = (c: CreativeData, k: SortKey) => {
    switch (k) {
      case 'creative': return <span className="truncate block max-w-[180px]">{c.creative}</span>;
      case 'impressions': return fmt(c.impressions); case 'clicks': return fmt(c.clicks);
      case 'ctr': return `${c.ctr.toFixed(2)}%`; case 'spend': return <span className="font-medium">{fmtWon(c.spend)}</span>;
      case 'conversions': return fmt(c.conversions); case 'roas': return <span className="font-medium">{c.roas.toFixed(2)}x</span>;
      default: return '';
    }
  };
  return (
    <Card>
      <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">소재별 상세</CardTitle><span className="text-[11px] text-muted-foreground">{creatives.length} creatives</span></div></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              {COLS.map((col) => (<th key={col.key} onClick={() => handleSort(col.key)} className={`py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                <span className="inline-flex items-center gap-0.5">{col.label}{sortKey === col.key && (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}</span></th>))}
            </tr></thead>
            <tbody>{sorted.map((c) => (
              <tr key={c.creative} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                {COLS.map((col) => (<td key={col.key} className={`py-2.5 px-2 tabular-nums ${col.align === 'left' ? 'text-left' : 'text-right'} ${col.key === 'creative' ? 'font-medium' : ''}`}>{cell(c, col.key)}</td>))}
              </tr>))}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AiQueryPanel({ rows, platform }: { rows: CsvRow[]; platform: Platform }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const suggestions = ['이번 기간 최고 성과 소재는?', 'CTR이 가장 높은 캠페인은?', '예산 최적화 제안해줘'];

  const ask = async (q: string) => {
    if (!q.trim() || rows.length === 0) return;
    setLoading(true); setError(''); setAnswer(null);
    try {
      const res = await fetch('/api/ads/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: buildAiContext(rows, platform), platform }),
      });
      if (res.ok) { const data = await res.json(); setAnswer(data.answer); }
      else setError('분석 요청에 실패했습니다.');
    } catch { setError('요청 중 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-violet-500" />
          <CardTitle className="text-sm">AI 캠페인 분석</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {suggestions.map((s) => (
            <button key={s} onClick={() => { setQuestion(s); ask(s); }}
              className="px-2.5 py-1 rounded-full text-[11px] border border-border text-muted-foreground hover:bg-muted transition-colors">{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(question); }}
            placeholder="캠페인 성과에 대해 질문하세요..."
            className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <button onClick={() => ask(question)} disabled={loading || !question.trim()}
            className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
            <Sparkles className={`size-3.5 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? '분석중...' : '질문'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {answer && (
          <div className="text-sm leading-relaxed rounded-lg border bg-muted/20 p-5 max-h-[400px] overflow-y-auto ai-answer" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Period Comparison ───────────────────────────────────

function PeriodComparisonChart({ rows, dateFrom, dateTo }: { rows: CsvRow[]; dateFrom: string; dateTo: string }) {
  const data = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const dayCount = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Current period
    const currentRows = rows.filter((r) => r.date >= dateFrom && r.date <= dateTo);
    // Previous period (same length, right before dateFrom)
    const prevStart = new Date(from);
    prevStart.setDate(prevStart.getDate() - dayCount);
    const prevEnd = new Date(from);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevFrom = prevStart.toISOString().slice(0, 10);
    const prevTo = prevEnd.toISOString().slice(0, 10);
    const prevRows = rows.filter((r) => r.date >= prevFrom && r.date <= prevTo);

    const agg = (list: CsvRow[]) => {
      const spend = list.reduce((s, r) => s + r.spend, 0);
      const imp = list.reduce((s, r) => s + r.impressions, 0);
      const clicks = list.reduce((s, r) => s + r.clicks, 0);
      const conv = list.reduce((s, r) => s + r.conversions, 0);
      const convVal = list.reduce((s, r) => s + r.convValue, 0);
      return {
        spend, impressions: imp, clicks, conversions: conv,
        ctr: imp > 0 ? (clicks / imp) * 100 : 0,
        roas: spend > 0 ? convVal / spend : 0,
      };
    };
    const cur = agg(currentRows);
    const prev = agg(prevRows);

    // Daily for chart overlay
    const dailyMap = (list: CsvRow[], label: string) => {
      const map = new Map<number, { spend: number; conv: number }>();
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const baseDate = sorted[0]?.date;
      if (!baseDate) return new Map<number, Record<string, number>>();
      for (const r of sorted) {
        const dayIdx = Math.floor((new Date(r.date).getTime() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24));
        const e = map.get(dayIdx) ?? { spend: 0, conv: 0 };
        e.spend += r.spend; e.conv += r.conversions;
        map.set(dayIdx, e);
      }
      const result = new Map<number, Record<string, number>>();
      for (const [dayIdx, d] of map) {
        result.set(dayIdx, { [`spend_${label}`]: d.spend, [`conv_${label}`]: d.conv });
      }
      return result;
    };
    const curMap = dailyMap(currentRows, 'cur');
    const prevMap = dailyMap(prevRows, 'prev');
    const merged: Record<string, number>[] = [];
    const maxDays = Math.max(curMap.size, prevMap.size, 1);
    for (let i = 0; i < maxDays; i++) {
      const entry: Record<string, number> = { day: i + 1 };
      const c = curMap.get(i);
      const p = prevMap.get(i);
      if (c) Object.assign(entry, c);
      if (p) Object.assign(entry, p);
      merged.push(entry);
    }

    return { cur, prev, prevFrom, prevTo, dayCount, chartData: merged };
  }, [rows, dateFrom, dateTo]);

  if (!data) return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">기간 비교</CardTitle></CardHeader>
      <CardContent><p className="text-xs text-muted-foreground">날짜 범위를 설정하면 이전 기간과 자동 비교됩니다.</p></CardContent>
    </Card>
  );

  const { cur, prev, prevFrom, prevTo, chartData } = data;
  const pctChange = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);

  const metrics = [
    { label: '지출', cur: fmtWon(cur.spend), prev: fmtWon(prev.spend), change: pctChange(cur.spend, prev.spend) },
    { label: 'CTR', cur: `${cur.ctr.toFixed(2)}%`, prev: `${prev.ctr.toFixed(2)}%`, change: pctChange(cur.ctr, prev.ctr) },
    { label: '전환수', cur: fmt(cur.conversions), prev: fmt(prev.conversions), change: pctChange(cur.conversions, prev.conversions) },
    { label: 'ROAS', cur: `${cur.roas.toFixed(2)}x`, prev: `${prev.roas.toFixed(2)}x`, change: pctChange(cur.roas, prev.roas) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">기간 비교</CardTitle>
          <span className="text-[10px] text-muted-foreground">현재: {dateFrom}~{dateTo} vs 이전: {prevFrom}~{prevTo}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border bg-muted/20 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
              <p className="text-sm font-semibold mt-0.5">{m.cur}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{m.prev}</span>
                <span className={`text-[10px] font-bold ${m.change > 0 ? 'text-emerald-500' : m.change < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {m.change > 0 ? '▲' : m.change < 0 ? '▼' : '—'}{Math.abs(m.change)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: '일차', fontSize: 10, position: 'insideBottomRight' }} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="spend_cur" name="현재 지출" stroke="#8B5CF6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spend_prev" name="이전 지출" stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.5} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── API Config Panel (#8) ──────────────────────────────

function ApiConfigPanel({ platform }: { platform: Platform }) {
  const CACHE_KEY_API = 'dott_ad_api_config';
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_API);
      if (cached) setConfig(JSON.parse(cached));
    } catch { /* ignore */ }
  }, []);

  const save = () => {
    localStorage.setItem(CACHE_KEY_API, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields = platform === 'meta'
    ? [{ key: 'meta_access_token', label: 'Meta Access Token' }, { key: 'meta_ad_account_id', label: 'Ad Account ID' }]
    : [{ key: 'google_client_id', label: 'Google Client ID' }, { key: 'google_client_secret', label: 'Client Secret' }, { key: 'google_customer_id', label: 'Customer ID' }];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{platform === 'meta' ? 'Meta' : 'Google'} API 연동 설정</CardTitle>
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Beta</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-[11px] text-muted-foreground mb-1 block">{f.label}</label>
            <input
              type="password"
              value={config[f.key] || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={`${f.label} 입력...`}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button onClick={save} className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium">
            {saved ? '저장됨!' : '저장'}
          </button>
          <span className="text-[10px] text-muted-foreground">* 토큰은 로컬에만 저장됩니다</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function AdsPage() {
  const [platform, setPlatform] = useState<Platform>('meta');
  const [metaRows, setMetaRows] = useState<CsvRow[]>([]);
  const [googleRows, setGoogleRows] = useState<CsvRow[]>([]);
  const [metaUploads, setMetaUploads] = useState<UploadRecord[]>([]);
  const [googleUploads, setGoogleUploads] = useState<UploadRecord[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);

  // ─── localStorage load ────────────────────────────────
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: StoredAdData = JSON.parse(cached);
        if (data.version === 1) {
          setMetaRows(data.meta.rows || []);
          setGoogleRows(data.google.rows || []);
          setMetaUploads(data.meta.uploads || []);
          setGoogleUploads(data.google.uploads || []);
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // ─── localStorage save ────────────────────────────────
  const persist = useCallback((mR: CsvRow[], gR: CsvRow[], mU: UploadRecord[], gU: UploadRecord[]) => {
    const data: StoredAdData = { version: 1, meta: { rows: mR, uploads: mU }, google: { rows: gR, uploads: gU } };
    const json = JSON.stringify(data);
    if (json.length > 4_000_000) { alert('저장 용량 한도(4MB)에 근접합니다. 오래된 데이터를 정리해주세요.'); }
    localStorage.setItem(CACHE_KEY, json);
  }, []);

  // ─── File handling ────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) return;
      const upload: UploadRecord = { fileName: file.name, uploadedAt: new Date().toISOString(), rowCount: parsed.length };
      if (platform === 'meta') {
        const merged = mergeRows(metaRows, parsed);
        const uploads = [...metaUploads, upload];
        setMetaRows(merged); setMetaUploads(uploads);
        persist(merged, googleRows, uploads, googleUploads);
      } else {
        const merged = mergeRows(googleRows, parsed);
        const uploads = [...googleUploads, upload];
        setGoogleRows(merged); setGoogleUploads(uploads);
        persist(metaRows, merged, metaUploads, uploads);
      }
    };
    reader.readAsText(file, 'utf-8');
  }, [platform, metaRows, googleRows, metaUploads, googleUploads, persist]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const clearPlatformData = useCallback(() => {
    if (!confirm(`${platform === 'meta' ? 'Meta' : 'Google'} Ads 데이터를 모두 삭제하시겠습니까?`)) return;
    if (platform === 'meta') { setMetaRows([]); setMetaUploads([]); persist([], googleRows, [], googleUploads); }
    else { setGoogleRows([]); setGoogleUploads([]); persist(metaRows, [], metaUploads, []); }
  }, [platform, metaRows, googleRows, metaUploads, googleUploads, persist]);

  // ─── Derived data ─────────────────────────────────────
  const activeRows = platform === 'meta' ? metaRows : googleRows;
  const activeUploads = platform === 'meta' ? metaUploads : googleUploads;

  const filteredRows = useMemo(() => {
    let r = activeRows;
    if (dateFrom) r = r.filter((row) => row.date >= dateFrom);
    if (dateTo) r = r.filter((row) => row.date <= dateTo);
    return r;
  }, [activeRows, dateFrom, dateTo]);

  const dateRange = useMemo(() => {
    if (activeRows.length === 0) return { min: '', max: '' };
    const dates = activeRows.map((r) => r.date).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [activeRows]);

  const applyPreset = useCallback((days: number) => {
    if (days === 0 || activeRows.length === 0) { setDateFrom(''); setDateTo(''); return; }
    const dates = activeRows.map((r) => r.date).sort();
    const maxDate = dates[dates.length - 1];
    const end = new Date(maxDate);
    const start = new Date(end); start.setDate(start.getDate() - days + 1);
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(maxDate);
  }, [activeRows]);

  const dailyData = useMemo<DailyData[]>(() => {
    const map = new Map<string, { spend: number; clicks: number; imp: number; conv: number; convVal: number }>();
    for (const r of filteredRows) {
      const e = map.get(r.date) ?? { spend: 0, clicks: 0, imp: 0, conv: 0, convVal: 0 };
      e.spend += r.spend; e.clicks += r.clicks; e.imp += r.impressions; e.conv += r.conversions; e.convVal += r.convValue;
      map.set(r.date, e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      date: date.slice(5), spend: d.spend,
      ctr: d.imp > 0 ? (d.clicks / d.imp) * 100 : 0, conversions: d.conv,
      roas: d.spend > 0 ? d.convVal / d.spend : 0,
    }));
  }, [filteredRows]);

  const creativeData = useMemo<CreativeData[]>(() => {
    const map = new Map<string, { imp: number; clicks: number; spend: number; conv: number; convVal: number }>();
    for (const r of filteredRows) {
      const e = map.get(r.creative) ?? { imp: 0, clicks: 0, spend: 0, conv: 0, convVal: 0 };
      e.imp += r.impressions; e.clicks += r.clicks; e.spend += r.spend; e.conv += r.conversions; e.convVal += r.convValue;
      map.set(r.creative, e);
    }
    return Array.from(map.entries()).map(([creative, d]) => ({
      creative, impressions: d.imp, clicks: d.clicks,
      ctr: d.imp > 0 ? (d.clicks / d.imp) * 100 : 0, spend: d.spend,
      conversions: d.conv, roas: d.spend > 0 ? d.convVal / d.spend : 0,
    }));
  }, [filteredRows]);

  const hasData = activeRows.length > 0;
  const suppressDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);

  if (!loaded) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-6 pb-12 space-y-6 animate-in fade-in duration-500" onDragOver={suppressDrag} onDrop={suppressDrag}>

      {/* ─── Header ─── */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {/* Platform toggle */}
          <div className="flex gap-1">
            <button onClick={() => setPlatform('meta')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${platform === 'meta' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}>Meta Ads</button>
            <button onClick={() => setPlatform('google')}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${platform === 'google' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}>Google Ads</button>
          </div>
          {/* API Config toggle */}
          <button onClick={() => setShowApiConfig(!showApiConfig)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors border border-border ${showApiConfig ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
            API 설정
          </button>
          {/* Upload */}
          <label className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border cursor-pointer overflow-hidden">
            <input type="file" accept=".csv" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <Upload className="size-3.5" />CSV 업로드
          </label>
        </div>
      </div>

      {/* ─── Date filter ─── */}
      {hasData && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {DATE_PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.days)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${!dateFrom && !dateTo && p.days === 0 ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}>{p.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="size-3.5 text-muted-foreground" />
            <input type="date" value={dateFrom} min={dateRange.min} max={dateRange.max}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-background text-xs" />
            <span className="text-muted-foreground">~</span>
            <input type="date" value={dateTo} min={dateRange.min} max={dateRange.max}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-background text-xs" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="p-0.5 rounded hover:bg-muted" title="전체 보기"><X className="size-3.5 text-muted-foreground" /></button>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground ml-auto">
            {fmt(filteredRows.length)}행 · {new Set(filteredRows.map((r) => r.date)).size}일 · {new Set(filteredRows.map((r) => r.creative)).size}소재
          </span>
        </div>
      )}

      {/* ─── Upload history ─── */}
      {hasData && activeUploads.length > 0 && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <BarChart3 className="size-3.5" />
          {activeUploads.map((u, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-muted/50">{u.fileName} ({u.rowCount}행, {new Date(u.uploadedAt).toLocaleDateString('ko-KR')})</span>
          ))}
          <button onClick={clearPlatformData} className="flex items-center gap-1 px-2 py-0.5 rounded text-red-500 hover:bg-red-500/10 transition-colors ml-auto">
            <Trash2 className="size-3" />전체 삭제
          </button>
        </div>
      )}

      {/* ─── API Config Panel ─── */}
      {showApiConfig && <ApiConfigPanel platform={platform} />}

      {!hasData ? (
        /* ─── Empty state ─── */
        <div onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragLeave={(e) => { e.stopPropagation(); setDragOver(false); }} onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-24 transition-colors ${dragOver ? 'border-violet-400 bg-violet-500/5' : 'border-border'}`}>
          <FileSpreadsheet className="size-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {platform === 'meta' ? 'Meta' : 'Google'} Ads CSV를 업로드해주세요
          </p>
          <p className="text-xs text-muted-foreground/60 mb-4">여러 파일을 순차 업로드하면 데이터가 누적됩니다</p>
          <input type="file" accept=".csv" onChange={onFileChange} className="text-sm" />
        </div>
      ) : (
        /* ─── Dashboard ─── */
        <>
          <SummaryCards rows={filteredRows} />

          {/* Row 1: AI */}
          <AiQueryPanel rows={filteredRows} platform={platform} />

          {/* Row 2: Daily + Pie */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2"><DailyChart dailyData={dailyData} /></div>
            <div className="col-span-1"><CampaignPieChart rows={filteredRows} /></div>
          </div>

          {/* Row 3: Scatter */}
          <SpendRoasScatter creatives={creativeData} />

          {/* Row 4: Bar */}
          <CreativeBarChart creatives={creativeData} />

          {/* Row 5: Period Comparison (#2) */}
          <PeriodComparisonChart rows={activeRows} dateFrom={dateFrom} dateTo={dateTo} />

          {/* Row 6: Table */}
          <CreativeTable creatives={creativeData} />
        </>
      )}
    </div>
  );
}
