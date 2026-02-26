'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, BarChart3, LayoutGrid, List, Pencil, Mail, ExternalLink, Trash2 } from 'lucide-react';
import type { Influencer, InfluencerCampaign, InfluencerCampaignStatus } from '@/types';
import InfluencerCard from '@/components/influencer/InfluencerCard';
import InfluencerForm from '@/components/influencer/InfluencerForm';
import CampaignPipeline from '@/components/influencer/CampaignPipeline';
import OutreachPanel from '@/components/influencer/OutreachPanel';
import AIRecommendation from '@/components/influencer/AIRecommendation';
import EmptyState from '@/components/shared/EmptyState';

type Tab = 'db' | 'campaigns';
type ViewMode = 'grid' | 'list';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  youtube: 'bg-red-500/15 text-red-600 dark:text-red-400',
  tiktok: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  blog: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function InfluencerPage() {
  const [tab, setTab] = useState<Tab>('db');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setShowAI(!showAI)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors cursor-pointer"
          >
            AI 추천
          </button>
          <button
            onClick={() => { setEditingInfluencer(null); setShowForm(true); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="size-3.5 inline mr-1" />
            추가
          </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-0.5 p-0.5 bg-muted/30 rounded-xl w-fit">
        <button
          onClick={() => setTab('db')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            tab === 'db' ? 'bg-card elevation-1 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="size-3.5" />
          인플루언서 DB
          <span className="text-[10px] opacity-60">{influencers.length}</span>
        </button>
        <button
          onClick={() => setTab('campaigns')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            tab === 'campaigns' ? 'bg-card elevation-1 text-foreground' : 'text-muted-foreground hover:text-foreground'
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
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/30">
              <button
                onClick={() => setPlatformFilter('')}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  !platformFilter ? 'bg-card elevation-1 text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                전체
              </button>
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p === platformFilter ? '' : p)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer capitalize ${
                    platformFilter === p ? 'bg-card elevation-1 text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/30 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-card elevation-1 text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="카드 보기"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-card elevation-1 text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="리스트 보기"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">로딩 중...</p>
          ) : influencers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="인플루언서가 없습니다"
              description="인플루언서를 추가하고 캠페인을 관리해보세요"
              action={{ label: '인플루언서 추가', onClick: () => { setEditingInfluencer(null); setShowForm(true); } }}
            />
          ) : viewMode === 'grid' ? (
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
          ) : (
            /* List view */
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">이름</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">플랫폼</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">팔로워</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[70px]">참여율</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">평균 좋아요</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">카테고리</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[100px]">단가</th>
                    <th className="w-[100px]" />
                  </tr>
                </thead>
                <tbody>
                  {influencers.map((inf) => {
                    const pColor = PLATFORM_COLORS[inf.platform] || 'bg-muted text-muted-foreground';
                    const profileUrl =
                      inf.platform === 'instagram' ? `https://instagram.com/${inf.handle}` :
                      inf.platform === 'youtube' ? `https://youtube.com/@${inf.handle}` :
                      inf.platform === 'tiktok' ? `https://tiktok.com/@${inf.handle}` : null;
                    return (
                      <tr key={inf.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground">
                              {inf.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold truncate">{inf.name}</p>
                              {inf.handle && <p className="text-[11px] text-muted-foreground">@{inf.handle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${pColor}`}>{inf.platform}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[12px] font-medium">{formatNumber(inf.followers)}</td>
                        <td className="px-3 py-2.5 text-right text-[12px]">{inf.engagement_rate.toFixed(1)}%</td>
                        <td className="px-3 py-2.5 text-right text-[12px] text-muted-foreground">{inf.avg_likes ? formatNumber(inf.avg_likes) : '-'}</td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{inf.category || '-'}</td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{inf.price_range || '-'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setOutreachId(inf.id)} className="p-1.5 rounded-md hover:bg-accent/10 transition-colors" title="아웃리치">
                              <Mail className="size-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => { setEditingInfluencer(inf); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="수정">
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </button>
                            {profileUrl && inf.handle && (
                              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-muted transition-colors" title="프로필">
                                <ExternalLink className="size-3.5 text-muted-foreground" />
                              </a>
                            )}
                            <button onClick={() => handleDelete(inf.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="삭제">
                              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
