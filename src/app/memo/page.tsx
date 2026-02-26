'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pin, PinOff, Trash2, Download, FileText, FileDown, Undo2, Trash, X, FileUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import type { BlockNoteEditor, Block } from '@blocknote/core';
import DynamicMemoEditor from '@/components/memo/DynamicMemoEditor';
import {
  serializeBlocks,
  parseTagsFromBlocks,
  getPreviewText,
} from '@/lib/memo-utils';

interface Memo {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const TAG_COLORS = [
  'bg-[var(--color-cat-blue)] text-[var(--color-cat-blue-text)]',
  'bg-[var(--color-cat-pink)] text-[var(--color-cat-pink-text)]',
  'bg-[var(--color-cat-green)] text-[var(--color-cat-green-text)]',
  'bg-[var(--color-cat-amber)] text-[var(--color-cat-amber-text)]',
  'bg-[var(--color-cat-peach)] text-[var(--color-cat-peach-text)]',
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MemoPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selected, setSelected] = useState<Memo | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [trashMode, setTrashMode] = useState(false);
  const [pendingMarkdown, setPendingMarkdown] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<BlockNoteEditor | null>(null);
  const latestContentRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchMemos = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tagFilter) params.set('tag', tagFilter);
    if (trashMode) params.set('trash', 'true');
    try {
      const res = await fetch(`/api/memos?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setMemos(data.memos || []);
    } catch {
      // silent
    }
  }, [search, tagFilter, trashMode]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  // Reset selection when switching modes
  useEffect(() => {
    setSelected(null);
  }, [trashMode]);

  // When selected memo changes, sync edit fields
  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title);
      latestContentRef.current = selected.content;
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save with debounce
  const autoSave = useCallback(
    (title: string, content: string, tags: string[]) => {
      if (!selected || trashMode) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const res = await fetch('/api/memos', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selected.id, title, content, tags }),
          });
          if (res.ok) {
            const data = await res.json();
            setMemos((prev) =>
              prev.map((m) => (m.id === data.memo.id ? data.memo : m))
            );
          }
        } catch {
          // silent
        }
        setSaving(false);
      }, 1000);
    },
    [selected, trashMode]
  );

  const handleTitleChange = (val: string) => {
    setEditTitle(val);
    const blocks = editorRef.current?.document as Block[] | undefined;
    const tags = blocks ? parseTagsFromBlocks(blocks) : selected?.tags || [];
    autoSave(val, latestContentRef.current, tags);
  };

  const handleEditorChange = (blocks: Block[]) => {
    const content = serializeBlocks(blocks);
    latestContentRef.current = content;
    const tags = parseTagsFromBlocks(blocks);
    autoSave(editTitle, content, tags);
  };

  const createMemo = async () => {
    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '새 메모', content: '' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setMemos((prev) => [data.memo, ...prev]);
      setSelected(data.memo);
    } catch {
      // silent
    }
  };

  // Import .md file as a new memo
  const importMarkdownFile = async (file: File) => {
    const text = await file.text();
    const fileName = file.name.replace(/\.md$/i, '');
    // Extract title: first # heading or filename
    const headingMatch = text.match(/^#\s+(.+)$/m);
    const title = headingMatch ? headingMatch[1].trim() : fileName;

    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: '' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setPendingMarkdown(text);
      setMemos((prev) => [data.memo, ...prev]);
      setSelected(data.memo);
    } catch {
      // silent
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.md')) {
      importMarkdownFile(file);
    }
    // Reset input so re-uploading same file works
    e.target.value = '';
  };

  const togglePin = async (memo: Memo) => {
    try {
      const res = await fetch('/api/memos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memo.id, pinned: !memo.pinned }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setMemos((prev) =>
        prev.map((m) => (m.id === data.memo.id ? data.memo : m))
      );
      if (selected?.id === memo.id) setSelected(data.memo);
    } catch {
      // silent
    }
  };

  // Soft delete — move to trash
  const deleteMemo = async (memo: Memo) => {
    try {
      const res = await fetch(`/api/memos?id=${memo.id}`, { method: 'DELETE' });
      if (!res.ok) return;
      setMemos((prev) => prev.filter((m) => m.id !== memo.id));
      if (selected?.id === memo.id) setSelected(null);
    } catch {
      // silent
    }
  };

  // Restore from trash
  const restoreMemo = async (memo: Memo) => {
    try {
      const res = await fetch('/api/memos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memo.id, deleted_at: null }),
      });
      if (!res.ok) return;
      setMemos((prev) => prev.filter((m) => m.id !== memo.id));
      if (selected?.id === memo.id) setSelected(null);
    } catch {
      // silent
    }
  };

  // Permanent delete
  const permanentDeleteMemo = async (memo: Memo) => {
    try {
      const res = await fetch(`/api/memos?id=${memo.id}&permanent=true`, { method: 'DELETE' });
      if (!res.ok) return;
      setMemos((prev) => prev.filter((m) => m.id !== memo.id));
      if (selected?.id === memo.id) setSelected(null);
    } catch {
      // silent
    }
  };

  // Empty trash
  const emptyTrash = async () => {
    for (const memo of memos) {
      await fetch(`/api/memos?id=${memo.id}&permanent=true`, { method: 'DELETE' });
    }
    setMemos([]);
    setSelected(null);
  };

  // Export functions
  const exportAsMarkdown = async () => {
    if (!editorRef.current || !selected) return;
    try {
      const md = await editorRef.current.blocksToMarkdownLossy(editorRef.current.document);
      downloadFile(`${selected.title || '메모'}.md`, md, 'text/markdown');
    } catch {
      // silent
    }
    setShowExportMenu(false);
  };

  const exportAsText = async () => {
    if (!editorRef.current || !selected) return;
    try {
      const { blocksToPlainText } = await import('@/lib/memo-utils');
      const text = blocksToPlainText(editorRef.current.document as Block[]);
      downloadFile(`${selected.title || '메모'}.txt`, text, 'text/plain');
    } catch {
      // silent
    }
    setShowExportMenu(false);
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = () => setShowExportMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showExportMenu]);

  // Collect all tags for filter
  const allTags = [...new Set(memos.flatMap((m) => m.tags))];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-3 pt-2 pb-0">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">메모</span>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        >
          <PanelLeftClose className="size-3.5" />
        </button>
      </div>
      {/* Search + trash toggle */}
      <div className="p-3 pb-2">
        {trashMode ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trash className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">휴지통</span>
                {memos.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/60">({memos.length})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {memos.length > 0 && (
                  <button
                    onClick={emptyTrash}
                    className="text-[10px] px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    비우기
                  </button>
                )}
                <button
                  onClick={() => setTrashMode(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  title="돌아가기"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="메모 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              {/* Tag filter chips */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tagFilter && (
                    <button
                      onClick={() => setTagFilter('')}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"
                    >
                      전체
                    </button>
                  )}
                  {allTags.slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                      className={`px-1.5 py-0.5 text-[10px] rounded cursor-pointer transition-colors ${
                        tagFilter === tag
                          ? getTagColor(tag)
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Memo list */}
        <div className="flex-1 overflow-y-auto">
          {!trashMode && memos.some((m) => m.pinned) && (
            <>
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold text-amber-500/70 dark:text-amber-400/60 uppercase tracking-widest flex items-center gap-1">
                  <Pin className="size-2.5 text-amber-500 dark:text-amber-400" /> 고정됨
                </span>
              </div>
              {memos
                .filter((m) => m.pinned)
                .map((memo) => (
                  <MemoListItem
                    key={memo.id}
                    memo={memo}
                    active={selected?.id === memo.id}
                    onSelect={() => setSelected(memo)}
                    onPin={() => togglePin(memo)}
                    onDelete={() => deleteMemo(memo)}
                  />
                ))}
              <div className="mx-3 my-1 border-t border-border/30" />
            </>
          )}
          {trashMode
            ? memos.map((memo) => (
                <TrashListItem
                  key={memo.id}
                  memo={memo}
                  active={selected?.id === memo.id}
                  onSelect={() => setSelected(memo)}
                  onRestore={() => restoreMemo(memo)}
                  onPermanentDelete={() => permanentDeleteMemo(memo)}
                />
              ))
            : memos
                .filter((m) => !m.pinned)
                .map((memo) => (
                  <MemoListItem
                    key={memo.id}
                    memo={memo}
                    active={selected?.id === memo.id}
                    onSelect={() => setSelected(memo)}
                    onPin={() => togglePin(memo)}
                    onDelete={() => deleteMemo(memo)}
                  />
                ))}
          {memos.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              {trashMode ? '휴지통이 비어있습니다' : '메모가 없습니다'}
            </div>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="p-3 pt-2 flex gap-2">
          {!trashMode && (
            <>
              <button
                onClick={createMemo}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer"
              >
                <Plus className="size-3.5" /> 새 메모
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                title="MD 파일 가져오기"
              >
                <FileUp className="size-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                onClick={() => setTrashMode(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                title="휴지통"
              >
                <Trash className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
  );

  return (
    <div className="flex h-full pt-2">
      {/* Left panel */}
      {sidebarOpen ? (
        <div className="w-72 flex flex-col shrink-0 border-r border-border/30">
          {sidebarContent}
        </div>
      ) : (
        <div className="flex items-start pt-2 pl-1 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            title="사이드바 열기"
          >
            <PanelLeftOpen className="size-3.5" />
          </button>
        </div>
      )}

      {/* Right panel – editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          trashMode ? (
            /* Trash preview — read-only */
            <>
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border/40">
                <span className="flex-1 text-lg font-semibold text-foreground truncate">
                  {selected.title || '제목 없음'}
                </span>
                <button
                  onClick={() => restoreMemo(selected)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer"
                >
                  <Undo2 className="size-3" /> 복원
                </button>
                <button
                  onClick={() => permanentDeleteMemo(selected)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3" /> 영구 삭제
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DynamicMemoEditor
                  key={selected.id}
                  initialContent={selected.content}
                  onChange={() => {}}
                  editorRef={editorRef}
                />
              </div>
              <div className="px-6 py-2 border-t border-border/40 text-[10px] text-muted-foreground/60">
                삭제됨: {selected.deleted_at ? formatDate(selected.deleted_at) : ''}
              </div>
            </>
          ) : (
            /* Normal editor */
            <>
              <div className="flex items-center gap-2 px-6 py-3 border-b border-border/40">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="제목 없음"
                  className="flex-1 text-lg font-semibold bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportMenu(!showExportMenu);
                    }}
                    title="내보내기"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Download className="size-4" />
                  </button>
                  {showExportMenu && (
                    <div
                      className="absolute right-0 top-full mt-1 w-40 glass-float rounded-xl z-50 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={exportAsMarkdown}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 cursor-pointer"
                      >
                        <FileDown className="size-3.5" />
                        마크다운 (.md)
                      </button>
                      <button
                        onClick={exportAsText}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/50 cursor-pointer"
                      >
                        <FileText className="size-3.5" />
                        텍스트 (.txt)
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                  {saving ? '저장 중...' : '저장됨'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                <DynamicMemoEditor
                  key={selected.id}
                  initialContent={selected.content}
                  initialMarkdown={pendingMarkdown && selected ? pendingMarkdown : undefined}
                  onChange={(blocks: Block[]) => {
                    if (pendingMarkdown) setPendingMarkdown(null);
                    handleEditorChange(blocks);
                  }}
                  editorRef={editorRef}
                />
              </div>

              {selected.tags.length > 0 && (
                <div className="flex items-center gap-1.5 px-6 py-2 border-t border-border/40">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${getTagColor(tag)}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {trashMode ? '메모를 선택하여 미리보기' : '메모를 선택하거나 새 메모를 만드세요'}
          </div>
        )}
      </div>
    </div>
  );
}

function MemoListItem({
  memo,
  active,
  onSelect,
  onPin,
  onDelete,
}: {
  memo: Memo;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-2.5 cursor-pointer transition-colors ${
        active ? 'bg-accent/10' : 'hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className={`text-xs font-medium truncate ${
            active ? 'text-accent' : 'text-foreground'
          }`}
        >
          {memo.title || '제목 없음'}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title={memo.pinned ? '고정 해제' : '고정'}
          >
            {memo.pinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive cursor-pointer"
            title="삭제"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
        {getPreviewText(memo.content)}
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-1">
        {formatDate(memo.updated_at)}
      </p>
    </div>
  );
}

function TrashListItem({
  memo,
  active,
  onSelect,
  onRestore,
  onPermanentDelete,
}: {
  memo: Memo;
  active: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-2.5 cursor-pointer transition-colors ${
        active ? 'bg-accent/10' : 'hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className={`text-xs font-medium truncate ${active ? 'text-accent' : 'text-muted-foreground'}`}>
          {memo.title || '제목 없음'}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            className="p-0.5 rounded text-muted-foreground hover:text-accent cursor-pointer"
            title="복원"
          >
            <Undo2 className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPermanentDelete();
            }}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive cursor-pointer"
            title="영구 삭제"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">
        {getPreviewText(memo.content)}
      </p>
      <p className="text-[10px] text-muted-foreground/40 mt-1">
        삭제: {memo.deleted_at ? formatDate(memo.deleted_at) : ''}
      </p>
    </div>
  );
}
