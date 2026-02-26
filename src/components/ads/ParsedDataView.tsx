'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

// ─── Recharts (dynamic for Electron) ────────────────────
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
import type { ParsedCampaign } from './DataImporter';

// ─── Helpers ─────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

function fmtWon(n: number): string {
  if (n >= 1000000) return `₩${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₩${(n / 1000).toFixed(0)}K`;
  return `₩${n}`;
}

type ChartMetric = 'spend' | 'conversions' | 'roas' | 'clicks';

const CHART_METRICS: { key: ChartMetric; label: string; color: string }[] = [
  { key: 'spend', label: 'Spend', color: '#7B5B8B' },
  { key: 'conversions', label: 'Conversions', color: '#10B981' },
  { key: 'roas', label: 'ROAS', color: '#6366F1' },
  { key: 'clicks', label: 'Clicks', color: '#F59E0B' },
];

// ─── Summary Cards ───────────────────────────────────────

function SummaryCards({ campaigns }: { campaigns: ParsedCampaign[] }) {
  const active = campaigns.filter((c) => c.status === 'Active');
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const stats = [
    { label: 'Campaigns', value: `${active.length}/${campaigns.length}`, sub: 'Active' },
    { label: 'Total Spend', value: fmtWon(totalSpend) },
    { label: 'Conversions', value: fmt(totalConversions) },
    { label: 'Avg ROAS', value: `${avgRoas.toFixed(1)}x` },
    { label: 'Avg CTR', value: `${avgCtr.toFixed(2)}%` },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          <p className="text-lg font-semibold mt-0.5">{s.value}</p>
          {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Campaign Comparison Charts ──────────────────────────

function CampaignCharts({ campaigns }: { campaigns: ParsedCampaign[] }) {
  const [metric, setMetric] = useState<ChartMetric>('spend');
  const activeMetric = CHART_METRICS.find((m) => m.key === metric)!;

  const chartData = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => (b[metric] as number) - (a[metric] as number));
    return sorted.slice(0, 15).map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
      [metric]: c[metric],
    }));
  }, [campaigns, metric]);

  const formatValue = (v: number) => {
    if (metric === 'spend') return fmtWon(v);
    if (metric === 'roas') return `${v}x`;
    return fmt(v);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Campaign Comparison</h3>
        <div className="flex gap-1">
          {CHART_METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                metric === m.key ? 'text-white' : 'text-muted-foreground hover:bg-muted'
              }`}
              style={metric === m.key ? { backgroundColor: m.color } : undefined}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 32)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(91,77,110,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatValue(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={140} />
            <Tooltip
              formatter={(v: unknown) => [formatValue(Number(v) || 0), activeMetric.label]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(91,77,110,0.2)' }}
            />
            <Bar dataKey={metric} fill={activeMetric.color} radius={[0, 4, 4, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Campaign Table ──────────────────────────────────────

type SortKey = keyof ParsedCampaign;
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'Active' | 'Paused' | 'Ended';

const STATUS_STYLE: Record<string, string> = {
  Active: 'text-green-600 bg-green-500/10',
  Paused: 'text-yellow-600 bg-yellow-500/10',
  Ended: 'text-gray-500 bg-gray-500/10',
};

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Campaign', align: 'left' },
  { key: 'status', label: 'Status', align: 'left' },
  { key: 'impressions', label: 'Impressions', align: 'right' },
  { key: 'clicks', label: 'Clicks', align: 'right' },
  { key: 'ctr', label: 'CTR', align: 'right' },
  { key: 'cpc', label: 'CPC', align: 'right' },
  { key: 'spend', label: 'Spend', align: 'right' },
  { key: 'conversions', label: 'Conv.', align: 'right' },
  { key: 'convRate', label: 'Conv.Rate', align: 'right' },
  { key: 'roas', label: 'ROAS', align: 'right' },
  { key: 'costPerConv', label: 'Cost/Conv', align: 'right' },
];

function CampaignTable({ campaigns }: { campaigns: ParsedCampaign[] }) {
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

  const renderCell = (c: ParsedCampaign, key: SortKey) => {
    switch (key) {
      case 'name': return <span className="truncate block max-w-[180px]">{c.name}</span>;
      case 'status': return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>{c.status}</span>;
      case 'impressions': return fmt(c.impressions);
      case 'clicks': return fmt(c.clicks);
      case 'ctr': return `${c.ctr.toFixed(2)}%`;
      case 'cpc': return fmtWon(c.cpc);
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
      <div className="flex items-center gap-3">
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
        <span className="text-[11px] text-muted-foreground ml-auto">
          {filtered.length} campaigns
        </span>
      </div>

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

export default function ParsedDataView({ campaigns }: { campaigns: ParsedCampaign[] }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SummaryCards campaigns={campaigns} />
      <CampaignCharts campaigns={campaigns} />
      <CampaignTable campaigns={campaigns} />
    </div>
  );
}
