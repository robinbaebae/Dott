'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AdCreativeProject } from '@/types';
import AdCreativeGrid from './AdCreativeGrid';

const STAGES = [
  { key: 'stage_1', label: '소재 생성', desc: '템플릿 기반 대량 생성' },
  { key: 'stage_2', label: '카피 매칭', desc: '소재별 광고 카피 자동 생성' },
  { key: 'stage_3', label: '캠페인 집행', desc: '메타 광고 자동 집행' },
  { key: 'stage_4', label: '성과 수집', desc: '캠페인 성과 데이터 수집' },
  { key: 'stage_5', label: 'AI 리포트', desc: 'AI 분석 & 리포트 생성' },
];

const SIZES = ['1080x1080', '1200x628', '1080x1920'];

const STATUS_INDEX: Record<string, number> = {
  stage_1: 0,
  stage_2: 1,
  stage_3: 2,
  stage_4: 3,
  stage_5: 4,
  completed: 5,
};

function notifyPet(message: string) {
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.contentStepNotification('ad_pipeline', message);
  }
}

export default function AdPipeline() {
  const [projects, setProjects] = useState<AdCreativeProject[]>([]);
  const [activeProject, setActiveProject] = useState<AdCreativeProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [copies, setCopies] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['1080x1080', '1200x628']);

  // Stage 3 form
  const [campaignName, setCampaignName] = useState('');
  const [dailyBudget, setDailyBudget] = useState('10000');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/ad-pipeline');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      /* skip */
    }
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ad-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      const proj = await res.json();
      setActiveProject(proj);
      setProjects((prev) => [proj, ...prev]);
      setCreating(false);
      setNewName('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runStage = async (stage: number) => {
    if (!activeProject) return;
    setLoading(true);
    try {
      let body: Record<string, unknown> = {};
      if (stage === 1) {
        const copyList = copies.split('\n').map((c) => c.trim()).filter(Boolean);
        if (copyList.length === 0) {
          alert('광고 카피를 최소 1개 입력해주세요.');
          setLoading(false);
          return;
        }
        body = { copies: copyList, sizes: selectedSizes };
      } else if (stage === 3) {
        body = { campaign_name: campaignName || activeProject.name, daily_budget: Number(dailyBudget) || 10000 };
      }

      const res = await fetch(`/api/ad-pipeline/${activeProject.id}/stage${stage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed');
        setLoading(false);
        return;
      }

      const updated = await res.json();
      setActiveProject(updated);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      const stageMessages = [
        '',
        `소재 ${updated.creatives?.length || 0}개 생성 완료!`,
        `광고 카피 ${updated.ad_copies?.length || 0}개 매칭 완료!`,
        '메타 캠페인 설정이 완료됐어요!',
        '성과 데이터를 수집했어요!',
        'AI 분석 리포트가 완성됐어요!',
      ];
      notifyPet(stageMessages[stage] || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentStageIndex = activeProject ? (STATUS_INDEX[activeProject.status] ?? 0) : 0;

  const deleteProject = async (id: string) => {
    try {
      await fetch(`/api/ad-pipeline?id=${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) setActiveProject(null);
    } catch {
      /* skip */
    }
  };

  const toggleSize = (s: string) => {
    setSelectedSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <Card>
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Ad Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">광고 소재 제작 → 집행 → 분석 파이프라인</p>
        </div>
        {!creating && !activeProject && (
          <Button size="sm" onClick={() => setCreating(true)}>
            + 새 프로젝트
          </Button>
        )}
        {activeProject && (
          <Button variant="ghost" size="sm" onClick={() => setActiveProject(null)} className="text-xs text-muted-foreground">
            목록으로
          </Button>
        )}
      </div>

      <CardContent className="pt-2">
        {/* ===== Create form ===== */}
        {creating && !activeProject && (
          <div className="space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="프로젝트 이름 (예: 3월 봄맞이 캠페인)"
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
            />
            <div className="flex gap-2">
              <Button onClick={createProject} disabled={loading || !newName.trim()}>
                {loading ? '생성 중...' : '프로젝트 생성'}
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>취소</Button>
            </div>
          </div>
        )}

        {/* ===== Project list ===== */}
        {!creating && !activeProject && (
          <div className="space-y-2">
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                아직 광고 파이프라인 프로젝트가 없습니다.
              </p>
            )}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p)}
                className="w-full text-left p-3 rounded-lg border hover:border-[#6B5B7B] hover:bg-[#6B5B7B]/5 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.status === 'completed' ? '완료' : `Stage ${STATUS_INDEX[p.status] + 1}`}
                  </Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                    className="text-muted-foreground/40 hover:text-red-500 text-xs"
                  >
                    x
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ===== Active project: stepper ===== */}
        {activeProject && (
          <div className="space-y-5">
            {/* Stepper bar */}
            <div className="flex gap-1">
              {STAGES.map((s, i) => (
                <div key={s.key} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-colors ${
                    i < currentStageIndex
                      ? 'bg-[#6B5B7B]'
                      : i === currentStageIndex
                        ? 'bg-[#6B5B7B]/60'
                        : 'bg-muted'
                  }`} />
                  <p className={`text-[10px] mt-1 ${
                    i === currentStageIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Stage content */}
            {/* Stage 1: Creative generation */}
            {currentStageIndex === 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{STAGES[0].desc}</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">광고 카피 (줄 단위)</label>
                  <textarea
                    value={copies}
                    onChange={(e) => setCopies(e.target.value)}
                    rows={4}
                    placeholder={"노코드로 팝업을 만들어보세요\n전환율을 높이는 배너 디자인\n1분만에 완성하는 마케팅 팝업"}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">사이즈</label>
                  <div className="flex gap-2 flex-wrap">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSize(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedSizes.includes(s)
                            ? 'bg-foreground text-background border-foreground'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={() => runStage(1)} disabled={loading} className="w-full">
                  {loading ? '소재 생성 중...' : '소재 대량 생성'}
                </Button>
              </div>
            )}

            {/* Stage 2: Ad copy generation */}
            {currentStageIndex === 1 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{STAGES[1].desc}</p>
                <AdCreativeGrid creatives={activeProject.creatives || []} />
                <Button onClick={() => runStage(2)} disabled={loading} className="w-full">
                  {loading ? '카피 생성 중...' : '광고 카피 자동 매칭'}
                </Button>
              </div>
            )}

            {/* Stage 3: Campaign creation */}
            {currentStageIndex === 2 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{STAGES[2].desc}</p>
                <AdCreativeGrid
                  creatives={activeProject.creatives || []}
                  adCopies={activeProject.ad_copies || []}
                />
                <div className="border rounded-lg p-3 space-y-2">
                  <label className="text-xs text-muted-foreground block">캠페인 이름</label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder={activeProject.name}
                  />
                  <label className="text-xs text-muted-foreground block">일 예산 (원)</label>
                  <Input
                    type="number"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                  />
                </div>
                <Button onClick={() => runStage(3)} disabled={loading} className="w-full">
                  {loading ? '캠페인 설정 중...' : '메타 캠페인 집행'}
                </Button>
              </div>
            )}

            {/* Stage 4: Performance data collection */}
            {currentStageIndex === 3 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{STAGES[3].desc}</p>
                {activeProject.campaign_config && (
                  <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                    <p>캠페인: <span className="font-medium">{String(activeProject.campaign_config.campaign_name || activeProject.name)}</span></p>
                    <p>일 예산: <span className="font-medium">{String(activeProject.campaign_config.daily_budget || 10000).toLocaleString()}원</span></p>
                    <p>소재: {activeProject.creatives?.length || 0}개 / 카피: {activeProject.ad_copies?.length || 0}개</p>
                  </div>
                )}
                <Button onClick={() => runStage(4)} disabled={loading} className="w-full">
                  {loading ? '성과 수집 중...' : '성과 데이터 수집'}
                </Button>
              </div>
            )}

            {/* Stage 5: AI report */}
            {currentStageIndex === 4 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{STAGES[4].desc}</p>
                {activeProject.performance_data && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-semibold">{Number(activeProject.performance_data.impressions || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Impressions</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{Number(activeProject.performance_data.clicks || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Clicks</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{String(activeProject.performance_data.ctr || '0')}%</p>
                        <p className="text-[10px] text-muted-foreground">CTR</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={() => runStage(5)} disabled={loading} className="w-full">
                  {loading ? 'AI 분석 중...' : 'AI 리포트 생성'}
                </Button>
              </div>
            )}

            {/* Completed */}
            {currentStageIndex >= 5 && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-sm font-medium">파이프라인 완료</p>
                  <p className="text-xs text-muted-foreground mt-1">AI 분석 리포트가 생성되었습니다.</p>
                </div>
                {activeProject.ai_report && (
                  <div className="bg-muted/40 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-xs font-medium mb-2">AI 리포트</p>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{activeProject.ai_report}</div>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => setActiveProject(null)}>
                  목록으로 돌아가기
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
