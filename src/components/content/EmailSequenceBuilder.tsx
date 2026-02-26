'use client';

import { useState, useEffect, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2,
  Trash2,
  Mail,
  Clock,
  Pencil,
  Save,
  X,
  Plus,
} from 'lucide-react';
import type { EmailSequence, EmailSequenceItem, EmailSequencePurpose } from '@/types';
import { EMAIL_SEQUENCE_PURPOSES } from '@/types';

export default function EmailSequenceBuilder() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [selected, setSelected] = useState<EmailSequence | null>(null);
  const [selectedItem, setSelectedItem] = useState<EmailSequenceItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCta, setEditCta] = useState('');
  const [savingGmail, setSavingGmail] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<EmailSequencePurpose>('welcome');
  const [targetAudience, setTargetAudience] = useState('');
  const [emailCount, setEmailCount] = useState(3);
  const [msgInput, setMsgInput] = useState('');
  const [keyMessages, setKeyMessages] = useState<string[]>([]);

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch('/api/email-sequence');
      if (res.ok) {
        const data = await res.json();
        setSequences(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const selectSequence = async (seq: EmailSequence) => {
    try {
      const res = await fetch(`/api/email-sequence?id=${seq.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
        setSelectedItem(null);
        setEditingItem(null);
      }
    } catch {
      setSelected(seq);
    }
  };

  const generate = async () => {
    if (!name.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/email-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          purpose,
          target_audience: targetAudience,
          email_count: emailCount,
          key_messages: keyMessages,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '생성 실패');
      }
      const data = await res.json();
      setSequences((prev) => [data, ...prev]);
      setSelected(data);
      setSelectedItem(null);
      // Reset form
      setName('');
      setTargetAudience('');
      setKeyMessages([]);
      toast.success('이메일 시퀀스가 생성됐어요');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      await fetch(`/api/email-sequence?id=${id}`, { method: 'DELETE' });
      setSequences((prev) => prev.filter((s) => s.id !== id));
      if (selected?.id === id) {
        setSelected(null);
        setSelectedItem(null);
      }
      toast.success('삭제됐어요');
    } catch {
      toast.error('삭제 실패');
    }
  };

  const startEdit = (item: EmailSequenceItem) => {
    setEditingItem(item.id);
    setEditSubject(item.subject);
    setEditBody(item.body_html);
    setEditCta(item.cta_text);
  };

  const cancelEdit = () => {
    setEditingItem(null);
  };

  const saveEdit = async (itemId: string) => {
    try {
      const res = await fetch('/api/email-sequence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_item',
          item_id: itemId,
          subject: editSubject,
          body_html: editBody,
          cta_text: editCta,
        }),
      });
      if (!res.ok) throw new Error('저장 실패');
      const updated = await res.json();

      // Update local state
      if (selected?.items) {
        const newItems = selected.items.map((i) => (i.id === itemId ? updated : i));
        setSelected({ ...selected, items: newItems });
      }
      if (selectedItem?.id === itemId) setSelectedItem(updated);
      setEditingItem(null);
      toast.success('저장됐어요');
    } catch {
      toast.error('저장 실패');
    }
  };

  const saveToGmail = async (item: EmailSequenceItem) => {
    setSavingGmail(item.id);
    try {
      const res = await fetch('/api/email-sequence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_to_gmail',
          item_id: item.id,
          to: '',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gmail 저장 실패');
      }
      const updated = await res.json();

      if (selected?.items) {
        const newItems = selected.items.map((i) => (i.id === item.id ? updated : i));
        setSelected({ ...selected, items: newItems });
      }
      if (selectedItem?.id === item.id) setSelectedItem(updated);
      toast.success('Gmail 임시보관함에 저장됐어요');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gmail 저장 실패');
    } finally {
      setSavingGmail(null);
    }
  };

  const addMessage = () => {
    const trimmed = msgInput.trim();
    if (!trimmed) return;
    if (!keyMessages.includes(trimmed)) {
      setKeyMessages([...keyMessages, trimmed]);
    }
    setMsgInput('');
  };

  const purposeLabel = (p: EmailSequencePurpose) =>
    EMAIL_SEQUENCE_PURPOSES.find((ep) => ep.value === p)?.label || p;

  const itemStatusLabel = (status: EmailSequenceItem['status']) => {
    switch (status) {
      case 'draft': return '초안';
      case 'edited': return '편집됨';
      case 'gmail_saved': return 'Gmail 저장됨';
    }
  };

  const itemStatusColor = (status: EmailSequenceItem['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'edited': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'gmail_saved': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-140px)]">
      {/* Left — Form + History */}
      <div className="w-72 shrink-0 flex flex-col gap-4">
        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">이메일 시퀀스 생성</h3>
          <Input
            placeholder="시퀀스 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={generating}
          />
          <Select value={purpose} onValueChange={(v) => setPurpose(v as EmailSequencePurpose)}>
            <SelectTrigger>
              <SelectValue placeholder="목적" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_SEQUENCE_PURPOSES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="타겟 오디언스"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={generating}
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">이메일 수: {emailCount}개</label>
            <input
              type="range"
              min={2}
              max={7}
              value={emailCount}
              onChange={(e) => setEmailCount(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">핵심 메시지</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keyMessages.map((m) => (
                <Badge key={m} variant="secondary" className="gap-1 pr-1 text-xs">
                  {m}
                  <button onClick={() => setKeyMessages(keyMessages.filter((k) => k !== m))} className="hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="메시지 입력 후 Enter"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addMessage(); }
              }}
              disabled={generating}
            />
          </div>
          <Button
            onClick={generate}
            disabled={generating || !name.trim()}
            className="w-full"
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                생성 중...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-1.5" />
                시퀀스 생성
              </>
            )}
          </Button>
        </div>

        {/* History */}
        <div className="bg-card border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">시퀀스 목록</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sequences.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                아직 시퀀스가 없어요
              </div>
            ) : (
              sequences.map((seq) => (
                <div
                  key={seq.id}
                  className={`group px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${
                    selected?.id === seq.id ? 'bg-muted/70' : ''
                  }`}
                  onClick={() => selectSequence(seq)}
                >
                  <div className="text-sm font-medium truncate">{seq.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {purposeLabel(seq.purpose)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{seq.email_count}개</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSequence(seq.id); }}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center — Timeline */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            왼쪽에서 시퀀스를 생성하거나 목록에서 선택하세요
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div>
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{purposeLabel(selected.purpose)}</Badge>
                {selected.target_audience && (
                  <span className="text-xs text-muted-foreground">타겟: {selected.target_audience}</span>
                )}
              </div>
              {selected.strategy_explanation && (
                <p className="text-sm text-muted-foreground mt-2 bg-muted/50 rounded p-3">
                  {selected.strategy_explanation}
                </p>
              )}
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-border" />

              <div className="space-y-4">
                {(selected.items || []).map((item, i) => (
                  <div key={item.id} className="relative pl-12">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-violet-500 border-2 border-background z-10" />
                    {/* Day label */}
                    <div className="absolute left-0 top-9 text-[10px] text-muted-foreground font-mono w-9 text-center">
                      D+{item.day_offset}
                    </div>

                    <div
                      className={`bg-card border rounded-lg overflow-hidden transition-colors ${
                        selectedItem?.id === item.id ? 'border-violet-500' : 'border-border'
                      }`}
                    >
                      {/* Card header */}
                      <div
                        className="px-4 py-3 flex items-start justify-between cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Mail className="size-4 text-violet-500 shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {editingItem === item.id ? (
                                <Input
                                  value={editSubject}
                                  onChange={(e) => setEditSubject(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-7 text-sm"
                                />
                              ) : (
                                item.subject || `이메일 ${i + 1}`
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="size-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">
                              Day {item.day_offset}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${itemStatusColor(item.status)}`}>
                              {itemStatusLabel(item.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {editingItem === item.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); saveEdit(item.id); }}
                              >
                                <Save className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                              >
                                <X className="size-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                disabled={savingGmail === item.id}
                                onClick={(e) => { e.stopPropagation(); saveToGmail(item); }}
                              >
                                {savingGmail === item.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Mail className="size-3.5" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Editing body */}
                      {editingItem === item.id && (
                        <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">CTA 텍스트</label>
                            <Input
                              value={editCta}
                              onChange={(e) => setEditCta(e.target.value)}
                              className="h-7 text-sm"
                              placeholder="CTA 버튼 텍스트"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">본문 HTML</label>
                            <Textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={8}
                              className="text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && editingItem !== item.id && (
                        <div className="px-4 pb-3 text-xs text-muted-foreground">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right — Preview */}
      <div className="w-80 shrink-0 flex flex-col">
        {selectedItem ? (
          <div className="bg-card border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">미리보기</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedItem.subject}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              <div
                className="bg-white text-black rounded"
                style={{ maxWidth: 600, margin: '0 auto' }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedItem.body_html) }}
              />
            </div>
            <div className="px-4 py-3 border-t border-border space-y-2">
              {selectedItem.cta_text && (
                <div className="text-xs">
                  <span className="text-muted-foreground">CTA: </span>
                  <span className="font-medium">{selectedItem.cta_text}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => startEdit(selectedItem)}
                >
                  <Pencil className="size-3.5 mr-1" />
                  편집
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={savingGmail === selectedItem.id}
                  onClick={() => saveToGmail(selectedItem)}
                >
                  {savingGmail === selectedItem.id ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <Mail className="size-3.5 mr-1" />
                  )}
                  Gmail 저장
                </Button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold">시퀀스 정보</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>목적</span>
                <span className="font-medium text-foreground">{purposeLabel(selected.purpose)}</span>
              </div>
              <div className="flex justify-between">
                <span>이메일 수</span>
                <span className="font-medium text-foreground">{selected.items?.length || selected.email_count}개</span>
              </div>
              {selected.target_audience && (
                <div className="flex justify-between">
                  <span>타겟</span>
                  <span className="font-medium text-foreground">{selected.target_audience}</span>
                </div>
              )}
              {selected.key_messages?.length > 0 && (
                <div>
                  <span className="block mb-1">핵심 메시지</span>
                  <div className="flex flex-wrap gap-1">
                    {selected.key_messages.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              타임라인에서 이메일을 클릭하면 미리보기가 표시돼요
            </p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            이메일을 선택하면 미리보기가 표시돼요
          </div>
        )}
      </div>
    </div>
  );
}
