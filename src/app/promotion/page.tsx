'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles,
  Plus,
  X,
  Trash2,
  Pencil,
  Copy,
  Tag,
  Target,
  Calendar,
  Megaphone,
  Loader2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const PromotionCanvas = lazy(() => import('@/components/promotion/PromotionCanvas'));

interface Promotion {
  id: string;
  name: string;
  type: string;
  discount_value: string;
  target: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  goal: string;
  description: string;
  ai_copy: string;
  status: string;
  created_at: string;
}

const TYPES = ['할인율', '정액할인', '1+1', '무료배송', '쿠폰', '사은품', '기타'];
const TARGETS = ['전체', '신규고객', '기존고객', 'VIP', '휴면고객'];
const GOALS = ['인지도 확대', '매출 증대', '신규 고객 확보', '재구매 유도', '재고 소진', '시즌 프로모션'];
const STATUSES = ['전체', 'draft', 'active', 'ended'];
const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  active: '진행 중',
  ended: '종료',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-500/15 text-green-600 dark:text-green-400',
  ended: 'bg-muted/50 text-muted-foreground/60',
};

const EMPTY_FORM = {
  name: '',
  type: '할인율',
  discount_value: '',
  target: '전체',
  start_date: '',
  end_date: '',
  budget: '',
  goal: '',
  description: '',
};

export default function PromotionPage() {
  const { status } = useSession();
  const isGuest = typeof window !== 'undefined' && sessionStorage.getItem('dott-guest') === 'true';
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('전체');

  // Canvas view
  const [canvasPromotion, setCanvasPromotion] = useState<Promotion | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // AI Copy
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/promotions${filterStatus !== '전체' ? `?status=${filterStatus}` : ''}`
      );
      const data = await res.json();
      if (res.ok) setPromotions(data.promotions);
    } catch {
      /* skip */
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    if (status === 'authenticated' || isGuest) fetchPromotions();
  }, [status, fetchPromotions]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      discount_value: p.discount_value || '',
      target: p.target,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      budget: p.budget ? String(p.budget) : '',
      goal: p.goal,
      description: p.description,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name.trim(),
        type: form.type,
        discount_value: form.discount_value.trim(),
        target: form.target,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: parseInt(form.budget) || 0,
        goal: form.goal,
        description: form.description.trim(),
      };
      const res = await fetch('/api/promotions', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setShowForm(false);
        fetchPromotions();
        // If new promotion, open canvas immediately
        if (!editingId && data.promotion) {
          setCanvasPromotion(data.promotion);
        }
      }
    } catch {
      /* skip */
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 프로모션을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/promotions?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchPromotions();
    } catch {
      /* skip */
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) fetchPromotions();
    } catch {
      /* skip */
    }
  };

  const generateAiCopy = async (p: Promotion) => {
    setGeneratingId(p.id);
    try {
      const res = await fetch('/api/promotions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p.name,
          type: p.type,
          discount_value: p.discount_value,
          target: p.target,
          start_date: p.start_date,
          end_date: p.end_date,
          goal: p.goal,
          description: p.description,
        }),
      });
      const data = await res.json();
      if (res.ok && data.copy) {
        await fetch('/api/promotions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, ai_copy: data.copy }),
        });
        fetchPromotions();
        setExpandedId(p.id);
      }
    } catch {
      /* skip */
    }
    setGeneratingId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const fmt = (n: number) => n.toLocaleString('ko-KR');

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';

  if (status !== 'authenticated' && !isGuest) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        로그인이 필요합니다.
      </div>
    );
  }

  // Canvas View
  if (canvasPromotion) {
    return (
      <div className="h-full w-full overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin mr-2" /> 캔버스 로딩 중...
          </div>
        }>
          <PromotionCanvas
            promotion={canvasPromotion}
            onBack={() => {
              setCanvasPromotion(null);
              fetchPromotions();
            }}
          />
        </Suspense>
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* Controls */}
      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus className="size-3" />
          새 프로모션
        </button>
      </div>

      {/* Status Filter */}
      <div className="inline-flex gap-0.5 p-0.5 rounded-xl bg-muted/30">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterStatus === s
                ? 'bg-card text-foreground elevation-1 font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === '전체' ? '전체' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Promotion List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-muted-foreground/50">불러오는 중...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Megaphone className="size-10 mx-auto text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground/50">아직 프로모션이 없습니다</p>
          <button
            onClick={openAdd}
            className="text-xs text-accent hover:underline cursor-pointer"
          >
            첫 프로모션 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => (
            <Card key={p.id} className="group">
              <CardContent className="p-4 space-y-3">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="text-sm font-semibold truncate cursor-pointer hover:text-accent transition-colors"
                        onClick={() => setCanvasPromotion(p)}
                      >
                        {p.name}
                      </h3>
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Tag className="size-3" />
                        {p.type}{p.discount_value ? ` ${p.discount_value}` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="size-3" />
                        {p.target}
                      </span>
                      {(p.start_date || p.end_date) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {p.start_date || '?'} ~ {p.end_date || '?'}
                        </span>
                      )}
                      {p.budget > 0 && <span>예산 {fmt(p.budget)}원</span>}
                      {p.goal && <span>{p.goal}</span>}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => setCanvasPromotion(p)}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                    >
                      <LayoutDashboard className="size-3.5" />
                      캔버스
                    </button>
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-card cursor-pointer"
                    >
                      <option value="draft">초안</option>
                      <option value="active">진행 중</option>
                      <option value="ended">종료</option>
                    </select>
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-muted/50 cursor-pointer">
                      <Pencil className="size-3 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-destructive/10 cursor-pointer">
                      <Trash2 className="size-3 text-destructive/70" />
                    </button>
                  </div>
                </div>

                {/* AI Copy Section */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <button
                    onClick={() => generateAiCopy(p)}
                    disabled={generatingId === p.id}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {generatingId === p.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {generatingId === p.id ? 'AI 생성 중...' : p.ai_copy ? 'AI 카피 재생성' : 'AI 카피 생성'}
                  </button>

                  {p.ai_copy && (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {expandedId === p.id ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        카피 보기
                      </button>
                      <button
                        onClick={() => copyToClipboard(p.ai_copy)}
                        className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Copy className="size-3" />
                        복사
                      </button>
                    </>
                  )}
                </div>

                {/* Expanded AI Copy */}
                {expandedId === p.id && p.ai_copy && (
                  <div className="bg-muted/30 rounded-lg p-4 text-xs leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{p.ai_copy}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-lg mx-4 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editingId ? '프로모션 수정' : '새 프로모션'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted/50 cursor-pointer">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">프로모션명 *</label>
              <input
                className={inputClass}
                placeholder="봄맞이 전품목 20% 할인"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">유형</label>
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">할인 상세</label>
                <input
                  className={inputClass}
                  placeholder="20% / 5,000원 / 2개 구매 시"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">대상</label>
                <select
                  className={inputClass}
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                >
                  {TARGETS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">목표</label>
                <select
                  className={inputClass}
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                >
                  <option value="">선택...</option>
                  {GOALS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">시작일</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">종료일</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">예산 (원)</label>
              <input
                type="number"
                className={inputClass}
                placeholder="1,000,000"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">설명</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="프로모션 상세 내용, 조건, 제외 품목 등..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className="w-full text-xs py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
            >
              {saving ? '저장 중...' : editingId ? '수정' : '생성'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
