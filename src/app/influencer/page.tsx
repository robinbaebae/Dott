'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, BarChart3 } from 'lucide-react';
import type { Influencer, InfluencerCampaign, InfluencerCampaignStatus } from '@/types';
import InfluencerCard from '@/components/influencer/InfluencerCard';
import InfluencerForm from '@/components/influencer/InfluencerForm';
import CampaignPipeline from '@/components/influencer/CampaignPipeline';
import OutreachPanel from '@/components/influencer/OutreachPanel';
import AIRecommendation from '@/components/influencer/AIRecommendation';
import EmptyState from '@/components/shared/EmptyState';

type Tab = 'db' | 'campaigns';

export default function InfluencerPage() {
  const [tab, setTab] = useState<Tab>('db');
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [campaigns, setCampaigns] = useState<InfluencerCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  // Dialogs
  const [showForm, setShowForm] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);
  const [outreachId, setOutreachId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);

  const fetchInfluencers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (platformFilter) params.set('platform', platformFilter);
    const res = await fetch(`/api/influencers?${params}`);
    if (res.ok) setInfluencers(await res.json());
  }, [search, platformFilter]);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/influencers/campaigns');
    if (res.ok) setCampaigns(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchInfluencers(), fetchCampaigns()]).finally(() => setLoading(false));
  }, [fetchInfluencers, fetchCampaigns]);

  const handleSave = async (data: Partial<Influencer>) => {
    const isEdit = !!editingInfluencer;
    const method = isEdit ? 'PATCH' : 'POST';
    const body = isEdit ? { ...data, id: editingInfluencer!.id } : data;

    const res = await fetch('/api/influencers', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingInfluencer(null);
      fetchInfluencers();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/influencers?id=${id}`, { method: 'DELETE' });
    fetchInfluencers();
  };

  const handleCampaignStatusChange = async (id: string, status: InfluencerCampaignStatus) => {
    await fetch('/api/influencers/campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchCampaigns();
  };

  const platforms = ['instagram', 'youtube', 'tiktok', 'blog'];

  return (
    <div className="max-w-6xl mx-auto px-6 pt-6 pb-12 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h2">Influencer</h1>
          <p className="text-caption mt-1">인플루언서 발굴 & 캠페인 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAI(!showAI)}
            className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors cursor-pointer press-scale"
          >
            AI 추천
          </button>
          <button
            onClick={() => { setEditingInfluencer(null); setShowForm(true); }}
            className="text-xs px-3 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer press-scale"
          >
            <Plus className="size-3.5 inline mr-1" />
            추가
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-0.5 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab('db')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            tab === 'db' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-3.5" />
          인플루언서 DB
          <span className="text-[10px] opacity-60">{influencers.length}</span>
        </button>
        <button
          onClick={() => setTab('campaigns')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            tab === 'campaigns' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="size-3.5" />
          캠페인
          <span className="text-[10px] opacity-60">{campaigns.length}</span>
        </button>
      </div>

      {/* AI Recommendation Panel */}
      {showAI && (
        <div className="mb-5">
          <AIRecommendation onSelect={(id) => {
            setShowAI(false);
            const inf = influencers.find((i) => i.id === id);
            if (inf) setOutreachId(inf.id);
          }} />
        </div>
      )}

      {/* DB Tab */}
      {tab === 'db' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="이름 또는 핸들 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPlatformFilter('')}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  !platformFilter ? 'bg-accent/15 text-accent font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                전체
              </button>
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p === platformFilter ? '' : p)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors cursor-pointer capitalize ${
                    platformFilter === p ? 'bg-accent/15 text-accent font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">로딩 중...</p>
          ) : influencers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="인플루언서가 없습니다"
              description="인플루언서를 추가하고 캠페인을 관리해보세요"
              action={{ label: '인플루언서 추가', onClick: () => { setEditingInfluencer(null); setShowForm(true); } }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {influencers.map((inf) => (
                <InfluencerCard
                  key={inf.id}
                  influencer={inf}
                  onEdit={() => { setEditingInfluencer(inf); setShowForm(true); }}
                  onSelect={() => setOutreachId(inf.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        campaigns.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="캠페인이 없습니다"
            description="인플루언서를 선택하고 캠페인을 시작해보세요"
          />
        ) : (
          <CampaignPipeline
            campaigns={campaigns}
            onStatusChange={handleCampaignStatusChange}
          />
        )
      )}

      {/* Dialogs */}
      {showForm && (
        <InfluencerForm
          influencer={editingInfluencer}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingInfluencer(null); }}
        />
      )}

      {outreachId && (
        <OutreachPanel
          influencerId={outreachId}
          onClose={() => setOutreachId(null)}
        />
      )}
    </div>
  );
}
