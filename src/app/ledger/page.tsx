'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Pencil,
  Receipt,
  Upload,
  Loader2,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  memo: string;
}

interface ParsedEntry {
  date: string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  memo: string;
}

const CATEGORIES = [
  '전체',
  '광고비',
  '제작비',
  '인플루언서',
  '이벤트/행사',
  '구독 서비스',
  '교통/출장',
  '점심식대',
  '접대비',
  '사무용품',
  '기타',
];

const PAYMENT_METHODS = ['법인카드', '개인카드', '계좌이체', '현금'];

const CAT_COLORS: Record<string, string> = {
  '광고비': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  '제작비': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  '인플루언서': 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  '이벤트/행사': 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  '구독 서비스': 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  '교통/출장': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  '점심식대': 'bg-green-500/15 text-green-600 dark:text-green-400',
  '접대비': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  '사무용품': 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  '기타': 'bg-muted text-muted-foreground',
};

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  amount: '',
  category: '기타',
  payment_method: '법인카드',
  memo: '',
};

export default function LedgerPage() {
  const { status } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('전체');

  // Month navigation
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // File upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/expenses?year=${year}&month=${month}${filterCat !== '전체' ? `&category=${encodeURIComponent(filterCat)}` : ''}`
      );
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses);
    } catch {
      /* skip */
    }
    setLoading(false);
  }, [year, month, filterCat]);

  useEffect(() => {
    if (status === 'authenticated') fetchExpenses();
  }, [status, fetchExpenses]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` });
    setShowForm(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      date: e.date,
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      payment_method: e.payment_method,
      memo: e.memo || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) return;
    setSaving(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        date: form.date,
        description: form.description.trim(),
        amount: parseInt(form.amount) || 0,
        category: form.category,
        payment_method: form.payment_method,
        memo: form.memo.trim(),
      };
      const res = await fetch('/api/expenses', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        fetchExpenses();
      }
    } catch {
      /* skip */
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 내역을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    } catch {
      /* skip */
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input

    setUploading(true);
    setUploadError('');
    setParsedEntries([]);
    setSelectedEntries(new Set());

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/expenses/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || '파일 처리에 실패했습니다.');
      } else if (data.entries?.length > 0) {
        setParsedEntries(data.entries);
        setSelectedEntries(new Set(data.entries.map((_: ParsedEntry, i: number) => i)));
      } else {
        setUploadError('파일에서 지출 내역을 찾지 못했습니다.');
      }
    } catch {
      setUploadError('파일 업로드 중 오류가 발생했습니다.');
    }
    setUploading(false);
  };

  const toggleEntry = (idx: number) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAllEntries = () => {
    if (selectedEntries.size === parsedEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(parsedEntries.map((_, i) => i)));
    }
  };

  const handleBulkSave = async () => {
    const toSave = parsedEntries.filter((_, i) => selectedEntries.has(i));
    if (toSave.length === 0) return;
    setBulkSaving(true);
    try {
      let success = 0;
      for (const entry of toSave) {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        if (res.ok) success++;
      }
      if (success > 0) {
        setParsedEntries([]);
        setSelectedEntries(new Set());
        fetchExpenses();
      }
    } catch {
      /* skip */
    }
    setBulkSaving(false);
  };

  const exportCsv = () => {
    const header = '날짜,내역,카테고리,금액,결제수단,메모';
    const rows = expenses.map(
      (e) =>
        `${e.date},"${e.description}","${e.category}",${e.amount},"${e.payment_method}","${e.memo || ''}"`
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `법인카드_${year}년${month}월.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary calculations
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const fmt = (n: number) => n.toLocaleString('ko-KR');

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';

  if (status !== 'authenticated') {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
        로그인이 필요합니다.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
          <button
            onClick={exportCsv}
            disabled={expenses.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="size-3" />
            CSV
          </button>
          <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
            {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
            {uploading ? '분석 중...' : '명세서 업로드'}
            <input
              type="file"
              accept=".xls,.xlsx,.pdf,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="size-3" />
            지출 추가
          </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
          <ChevronLeft className="size-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium min-w-[120px] text-center">
          {year}년 {month}월
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-xs">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError('')} className="shrink-0 cursor-pointer">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Parsed Entries Preview */}
      {parsedEntries.length > 0 && (
        <Card className="border-accent/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-accent" />
                <span className="text-sm font-semibold">파싱 결과</span>
                <span className="text-[11px] text-muted-foreground">
                  {selectedEntries.size}/{parsedEntries.length}건 선택
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAllEntries}
                  className="text-[11px] text-accent hover:underline cursor-pointer"
                >
                  {selectedEntries.size === parsedEntries.length ? '전체 해제' : '전체 선택'}
                </button>
                <button
                  onClick={() => { setParsedEntries([]); setSelectedEntries(new Set()); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {parsedEntries.map((entry, i) => (
                <div
                  key={i}
                  onClick={() => toggleEntry(i)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedEntries.has(i) ? 'bg-accent/10' : 'bg-muted/20 opacity-50'
                  }`}
                >
                  <div className={`shrink-0 size-4 rounded border flex items-center justify-center ${
                    selectedEntries.has(i) ? 'bg-accent border-accent' : 'border-border'
                  }`}>
                    {selectedEntries.has(i) && <Check className="size-3 text-accent-foreground" />}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground w-20">{entry.date}</span>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${CAT_COLORS[entry.category] || CAT_COLORS['기타']}`}>
                    {entry.category}
                  </span>
                  <span className="flex-1 text-xs truncate">{entry.description}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {fmt(entry.amount)}원
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                합계: <span className="font-semibold text-foreground">
                  {fmt(parsedEntries.filter((_, i) => selectedEntries.has(i)).reduce((s, e) => s + e.amount, 0))}원
                </span>
              </span>
              <button
                onClick={handleBulkSave}
                disabled={selectedEntries.size === 0 || bulkSaving}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
              >
                {bulkSaving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                {bulkSaving ? '등록 중...' : `${selectedEntries.size}건 일괄 등록`}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground mb-1">총 지출</p>
            <p className="text-lg font-bold">{fmt(totalAmount)}<span className="text-xs font-normal text-muted-foreground ml-0.5">원</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground mb-1">건수</p>
            <p className="text-lg font-bold">{expenses.length}<span className="text-xs font-normal text-muted-foreground ml-0.5">건</span></p>
          </CardContent>
        </Card>
        {sortedCategories.slice(0, 2).map(([cat, total]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground mb-1">{cat}</p>
              <p className="text-lg font-bold">{fmt(total)}<span className="text-xs font-normal text-muted-foreground ml-0.5">원</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown bar */}
      {totalAmount > 0 && (
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden">
            {sortedCategories.map(([cat, total]) => (
              <div
                key={cat}
                className={`${CAT_COLORS[cat]?.split(' ')[0] || 'bg-muted'} transition-all`}
                style={{ width: `${(total / totalAmount) * 100}%` }}
                title={`${cat}: ${fmt(total)}원 (${((total / totalAmount) * 100).toFixed(1)}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {sortedCategories.map(([cat, total]) => (
              <span key={cat} className="text-[11px] text-muted-foreground">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${CAT_COLORS[cat]?.split(' ')[0] || 'bg-muted'}`} />
                {cat} {fmt(total)}원 ({((total / totalAmount) * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
              filterCat === cat
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-muted-foreground/50">불러오는 중...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Receipt className="size-10 mx-auto text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground/50">이번 달 지출 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {expenses.map((e) => (
            <Card key={e.id} className="group">
              <CardContent className="p-3 flex items-center gap-3">
                {/* Date */}
                <div className="shrink-0 w-12 text-center">
                  <p className="text-xs font-medium">{e.date.split('-')[2]}일</p>
                  <p className="text-[10px] text-muted-foreground">
                    {['일','월','화','수','목','금','토'][new Date(e.date).getDay()]}
                  </p>
                </div>

                {/* Category badge */}
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${CAT_COLORS[e.category] || CAT_COLORS['기타']}`}>
                  {e.category}
                </span>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{e.description}</p>
                  {e.memo && (
                    <p className="text-[11px] text-muted-foreground truncate">{e.memo}</p>
                  )}
                </div>

                {/* Amount */}
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {fmt(e.amount)}<span className="text-xs font-normal text-muted-foreground">원</span>
                </p>

                {/* Payment method */}
                <span className="shrink-0 text-[10px] text-muted-foreground/60">{e.payment_method}</span>

                {/* Actions */}
                <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-muted/50 cursor-pointer">
                    <Pencil className="size-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-destructive/10 cursor-pointer">
                    <Trash2 className="size-3 text-destructive/70" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md mx-4 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editingId ? '지출 수정' : '지출 추가'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted/50 cursor-pointer">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">날짜</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">금액 (원)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="50,000"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">내역</label>
              <input
                className={inputClass}
                placeholder="페이스북 광고비 결제"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">카테고리</label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c !== '전체').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">결제수단</label>
                <select
                  className={inputClass}
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">메모 (선택)</label>
              <input
                className={inputClass}
                placeholder="참고 사항..."
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!form.description.trim() || !form.amount || saving}
              className="w-full text-xs py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
            >
              {saving ? '저장 중...' : editingId ? '수정' : '추가'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
