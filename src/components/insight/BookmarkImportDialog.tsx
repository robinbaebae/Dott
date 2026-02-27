'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, ChevronRight, ChevronDown, Folder, Globe, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ChromeProfile {
  dirName: string;
  displayName: string;
}

interface BookmarkNode {
  type: 'url' | 'folder';
  name: string;
  url?: string;
  date_added?: string;
  children?: BookmarkNode[];
}

interface FlatBookmark {
  url: string;
  name: string;
  date_added?: string;
  folder_path: string;
}

function collectBookmarks(node: BookmarkNode, path: string): FlatBookmark[] {
  const results: FlatBookmark[] = [];
  if (node.type === 'url' && node.url) {
    results.push({ url: node.url, name: node.name, date_added: node.date_added, folder_path: path });
  }
  if (node.children) {
    const nextPath = path ? `${path}/${node.name}` : node.name;
    for (const child of node.children) {
      results.push(...collectBookmarks(child, nextPath));
    }
  }
  return results;
}

function FolderTree({
  node,
  path,
  selectedUrls,
  onToggle,
  onToggleFolder,
}: {
  node: BookmarkNode;
  path: string;
  selectedUrls: Set<string>;
  onToggle: (url: string) => void;
  onToggleFolder: (bookmarks: FlatBookmark[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (node.type === 'url' && node.url) {
    return (
      <label className="flex items-center gap-2 py-0.5 pl-1 cursor-pointer hover:bg-muted/50 rounded text-xs">
        <input
          type="checkbox"
          checked={selectedUrls.has(node.url)}
          onChange={() => onToggle(node.url!)}
          className="accent-violet-500 size-3.5"
        />
        <Globe className="size-3 text-muted-foreground shrink-0" />
        <span className="truncate">{node.name || node.url}</span>
      </label>
    );
  }

  if (node.type === 'folder' && node.children) {
    const nextPath = path ? `${path}/${node.name}` : node.name;
    const folderBookmarks = collectBookmarks(node, path);
    const allSelected = folderBookmarks.length > 0 && folderBookmarks.every((b) => selectedUrls.has(b.url));
    const someSelected = folderBookmarks.some((b) => selectedUrls.has(b.url));

    return (
      <div>
        <div className="flex items-center gap-1 py-0.5 hover:bg-muted/50 rounded">
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={() => onToggleFolder(folderBookmarks)}
            className="accent-violet-500 size-3.5"
          />
          <Folder className="size-3 text-amber-500 shrink-0" />
          <span className="text-xs font-medium truncate">{node.name}</span>
          <span className="text-[10px] text-muted-foreground ml-1">({folderBookmarks.length})</span>
        </div>
        {expanded && (
          <div className="pl-5">
            {node.children.map((child, i) => (
              <FolderTree
                key={`${child.name}-${i}`}
                node={child}
                path={nextPath}
                selectedUrls={selectedUrls}
                onToggle={onToggle}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function BookmarkImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [roots, setRoots] = useState<Record<string, BookmarkNode> | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [allBookmarks, setAllBookmarks] = useState<FlatBookmark[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load profiles when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    if (!window.electronAPI?.readChromeBookmarks) return;
    window.electronAPI.readChromeBookmarks().then((result) => {
      setLoading(false);
      if (result?.profiles) {
        setProfiles(result.profiles);
        if (result.profiles.length === 1) {
          setSelectedProfile(result.profiles[0].dirName);
        }
      } else if (result?.error) {
        toast.error(`Chrome 북마크를 읽을 수 없습니다: ${result.error}`);
      }
    });
  }, [open]);

  // Load bookmarks when profile selected
  useEffect(() => {
    if (!selectedProfile) return;
    setLoading(true);
    if (!window.electronAPI?.readChromeBookmarks) return;
    window.electronAPI.readChromeBookmarks(selectedProfile).then((result) => {
      setLoading(false);
      if (result?.roots) {
        const typedRoots = result.roots as Record<string, BookmarkNode>;
        setRoots(typedRoots);
        // Collect all bookmarks for convenience
        const all: FlatBookmark[] = [];
        for (const root of Object.values(typedRoots)) {
          all.push(...collectBookmarks(root, ''));
        }
        setAllBookmarks(all);
        setSelectedUrls(new Set());
      } else if (result?.error) {
        toast.error(`북마크 로드 실패: ${result.error}`);
      }
    });
  }, [selectedProfile]);

  const toggleUrl = useCallback((url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((bookmarks: FlatBookmark[]) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      const allIn = bookmarks.every((b) => next.has(b.url));
      for (const b of bookmarks) {
        if (allIn) next.delete(b.url); else next.add(b.url);
      }
      return next;
    });
  }, []);

  const selectAll = () => {
    if (selectedUrls.size === allBookmarks.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(allBookmarks.map((b) => b.url)));
    }
  };

  const handleImport = async () => {
    const toImport = allBookmarks.filter((b) => selectedUrls.has(b.url));
    if (toImport.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch('/api/insights/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks: toImport }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.imported}개 북마크를 가져왔습니다`);
        setOpen(false);
        setRoots(null);
        setSelectedUrls(new Set());
        setSelectedProfile('');
        onImported();
      } else {
        toast.error(data.error || 'Import 실패');
      }
    } catch (e) {
      console.error('Import error:', e);
      toast.error('Import 중 오류가 발생했습니다');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Download className="size-3" />
          Import
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Chrome 북마크 가져오기</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && profiles.length > 1 && !roots && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Chrome 프로필을 선택하세요</p>
            <div className="space-y-1">
              {profiles.map((p) => (
                <button
                  key={p.dirName}
                  onClick={() => setSelectedProfile(p.dirName)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  {p.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && roots && (
          <>
            <div className="flex items-center justify-between">
              {profiles.length > 1 && (
                <button
                  onClick={() => { setRoots(null); setSelectedProfile(''); setSelectedUrls(new Set()); setAllBookmarks([]); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3" />
                  프로필 선택
                </button>
              )}
              <button onClick={selectAll} className="text-xs text-violet-600 hover:underline">
                {selectedUrls.size === allBookmarks.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedUrls.size}개 선택 / {allBookmarks.length}개 전체
              </span>
            </div>
            <div className="flex-1 overflow-y-auto border rounded-lg p-2 min-h-0 max-h-[50vh]">
              {Object.entries(roots).map(([key, node]) => (
                <FolderTree
                  key={key}
                  node={node}
                  path=""
                  selectedUrls={selectedUrls}
                  onToggle={toggleUrl}
                  onToggleFolder={toggleFolder}
                />
              ))}
            </div>
            <Button
              onClick={handleImport}
              disabled={selectedUrls.size === 0 || importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  가져오는 중...
                </>
              ) : (
                `${selectedUrls.size}개 북마크 가져오기`
              )}
            </Button>
          </>
        )}

        {!loading && profiles.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chrome 북마크를 찾을 수 없습니다
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
