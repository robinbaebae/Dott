'use client';

import { INFLUENCER_CAMPAIGN_STATUSES, InfluencerCampaignStatus } from '@/types';

interface Campaign {
  id: string;
  name: string;
  influencer_id: string;
  influencer_name?: string | null;
  status: InfluencerCampaignStatus;
  campaign_type: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

interface Props {
  campaigns: Campaign[];
  onStatusChange: (id: string, status: InfluencerCampaignStatus) => void;
}

const STATUS_COLORS: Record<string, string> = {
  identified: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  contacted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  negotiating: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  contracted: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  live: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

function formatBudget(n: number | null): string {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

export default function CampaignPipeline({ campaigns, onStatusChange }: Props) {
  const grouped = INFLUENCER_CAMPAIGN_STATUSES.reduce<Record<string, Campaign[]>>((acc, s) => {
    acc[s.value] = campaigns.filter((c) => c.status === s.value);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        {INFLUENCER_CAMPAIGN_STATUSES.map((s) => {
          const count = grouped[s.value]?.length || 0;
          return (
            <div key={s.value} className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${STATUS_COLORS[s.value] || 'bg-muted'}`}>
              {s.label}
              <span className="font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Pipeline columns */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-3 min-w-full pb-2">
          {INFLUENCER_CAMPAIGN_STATUSES.filter((s) => (grouped[s.value]?.length || 0) > 0).map((s) => (
            <div key={s.value} className="w-[220px] shrink-0">
              <div className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-t-lg ${STATUS_COLORS[s.value] || 'bg-muted'}`}>
                {s.label} ({grouped[s.value]?.length || 0})
              </div>
              <div className="space-y-2 mt-2">
                {grouped[s.value]?.map((c) => (
                  <div key={c.id} className="rounded-lg border bg-card p-3 hover:bg-muted/10 transition-colors">
                    <p className="text-[12px] font-semibold leading-snug mb-1">{c.name}</p>
                    {c.influencer_name && (
                      <p className="text-[11px] text-muted-foreground mb-1.5">@{c.influencer_name}</p>
                    )}
                    {c.budget && (
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        예산: {formatBudget(c.budget)}
                      </p>
                    )}
                    {c.campaign_type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">
                        {c.campaign_type}
                      </span>
                    )}
                    {/* Status change */}
                    <div className="mt-2 pt-2 border-t">
                      <select
                        value={c.status}
                        onChange={(e) => onStatusChange(c.id, e.target.value as InfluencerCampaignStatus)}
                        className="w-full text-[11px] px-2 py-1 rounded border bg-background"
                      >
                        {INFLUENCER_CAMPAIGN_STATUSES.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
