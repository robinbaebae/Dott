'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  InfluencerCampaign,
  InfluencerCampaignStatus,
  INFLUENCER_CAMPAIGN_STATUSES,
} from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CampaignPipelineProps {
  campaigns: InfluencerCampaign[];
  onStatusChange: (id: string, status: InfluencerCampaignStatus) => void;
}

function formatBudget(n: number | null): string {
  if (n == null) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

export default function CampaignPipeline({ campaigns, onStatusChange }: CampaignPipelineProps) {
  const statusValues = INFLUENCER_CAMPAIGN_STATUSES.map((s) => s.value);

  const grouped = INFLUENCER_CAMPAIGN_STATUSES.map((status) => ({
    ...status,
    items: campaigns.filter((c) => c.status === status.value),
  }));

  const movePrev = (campaign: InfluencerCampaign) => {
    const idx = statusValues.indexOf(campaign.status);
    if (idx > 0) {
      onStatusChange(campaign.id, statusValues[idx - 1]);
    }
  };

  const moveNext = (campaign: InfluencerCampaign) => {
    const idx = statusValues.indexOf(campaign.status);
    if (idx < statusValues.length - 1) {
      onStatusChange(campaign.id, statusValues[idx + 1]);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {grouped.map((col) => (
        <div key={col.value} className="min-w-[220px] w-[220px] shrink-0">
          {/* Column header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold">{col.label}</span>
            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {col.items.length}
            </span>
          </div>

          {/* Campaign cards */}
          <div className="space-y-2">
            {col.items.map((campaign) => (
              <Card key={campaign.id} className="hover-lift">
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate mb-1">{campaign.name}</p>
                  {campaign.influencer && (
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {campaign.influencer.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    {campaign.campaign_type && (
                      <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[11px]">
                        {campaign.campaign_type}
                      </span>
                    )}
                    <span>{formatBudget(campaign.budget)}</span>
                  </div>

                  {/* Status navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => movePrev(campaign)}
                      disabled={statusValues.indexOf(campaign.status) === 0}
                      className="p-1 rounded hover:bg-muted disabled:opacity-20 cursor-pointer disabled:cursor-default"
                      aria-label="이전 단계"
                    >
                      <ChevronLeft className="size-3.5 text-muted-foreground" />
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {col.label}
                    </span>
                    <button
                      onClick={() => moveNext(campaign)}
                      disabled={statusValues.indexOf(campaign.status) === statusValues.length - 1}
                      className="p-1 rounded hover:bg-muted disabled:opacity-20 cursor-pointer disabled:cursor-default"
                      aria-label="다음 단계"
                    >
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {col.items.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground/50">
                캠페인 없음
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
