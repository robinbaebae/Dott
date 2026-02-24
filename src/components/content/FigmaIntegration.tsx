'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Figma,
  Link2,
  Unlink,
  ImagePlus,
  X,
  Upload,
  Clipboard,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { FigmaPush } from '@/types';

const SIZES = [
  { value: '1080x1080', label: 'Square (1080x1080)' },
  { value: '1200x628', label: 'Facebook/LinkedIn (1200x628)' },
  { value: '1080x1920', label: 'Story/Reels (1080x1920)' },
];

type PushStatus = 'idle' | 'generating' | 'previewing' | 'pushing' | 'done' | 'failed';

export default function FigmaIntegration() {
  // Connection
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Banner inputs
  const [copy, setCopy] = useState('');
  const [reference, setReference] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState('');
  const [size, setSize] = useState('1080x1080');
  const [figmaFileUrl, setFigmaFileUrl] = useState('');

  // Status & results
  const [pushStatus, setPushStatus] = useState<PushStatus>('idle');
  const [error, setError] = useState('');
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);
  const [figmaScreenshot, setFigmaScreenshot] = useState<string | null>(null);

  // Recent pushes
  const [recentPushes, setRecentPushes] = useState<FigmaPush[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/figma/connect');
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/figma/push');
      if (res.ok) {
        const data = await res.json();
        setRecentPushes(data);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    checkConnection();
    fetchRecent();
  }, []);

  const connect = async () => {
    if (!token.trim() || connecting) return;
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/figma/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnected(true);
        setToken('');
      } else {
        setError(data.error || 'Connection failed');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await fetch('/api/figma/connect', { method: 'DELETE' });
      setConnected(false);
    } catch {
      // silently fail
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      setReferenceImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setReferenceImage(null);
    setReferenceImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderPreview = useCallback(async (id: string) => {
    try {
      setPushStatus('previewing');
      // Fetch the banner HTML
      const res = await fetch(`/api/banner?id=${id}`);
      if (!res.ok) return;
      const banner = await res.json();

      // Render to image using html-to-image via hidden iframe approach
      const [w, h] = (banner.size || '1080x1080').split('x').map(Number);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;border:none;`;
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      iframeDoc.open();
      iframeDoc.write(banner.html);
      iframeDoc.close();

      // Wait for rendering
      await new Promise((r) => setTimeout(r, 500));

      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(iframeDoc.documentElement, { width: w, height: h });
      document.body.removeChild(iframe);

      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewDataUrl(url);
      }
    } catch (err) {
      console.error('Preview rendering failed:', err);
    }
  }, []);

  const generateAndPush = async () => {
    if (!copy.trim()) return;
    setPushStatus('generating');
    setError('');
    setBannerId(null);
    setPreviewDataUrl(null);
    setFigmaUrl(null);
    setFigmaScreenshot(null);

    try {
      // Step 1: Generate banner via API
      const res = await fetch('/api/figma/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copy,
          reference,
          size,
          referenceImage,
          figmaFileUrl: figmaFileUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const { bannerId: newBannerId, fileKey } = await res.json();
      setBannerId(newBannerId);

      // Step 2: Render preview
      await renderPreview(newBannerId);

      // Step 3: Push to Figma via Electron IPC
      if (window.electronAPI?.figmaCapture && fileKey && fileKey !== 'local') {
        setPushStatus('pushing');
        try {
          const bannerUrl = `${window.location.origin}/banner/${newBannerId}`;
          const result = await window.electronAPI.figmaCapture({
            bannerUrl,
            fileKey,
            outputMode: 'push',
          });

          if (result?.figmaUrl) {
            setFigmaUrl(result.figmaUrl);

            // Fetch Figma screenshot
            if (result.screenshotUrl) {
              setFigmaScreenshot(result.screenshotUrl);
            }

            // Update DB status
            await fetch('/api/figma/push', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bannerId: newBannerId,
                figmaUrl: result.figmaUrl,
                status: 'done',
              }),
            });

            setPushStatus('done');
          } else {
            throw new Error(result?.error || 'Figma push returned no URL');
          }
        } catch (pushErr) {
          console.error('Figma push failed:', pushErr);
          setPushStatus('failed');
          setError('Figma push 실패. 이미지를 클립보드에 복사할 수 있습니다.');
        }
      } else {
        // No Electron or no file key — show preview only
        setPushStatus('done');
      }

      fetchRecent();
    } catch (err) {
      setPushStatus('failed');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const copyToClipboard = async () => {
    if (!previewDataUrl) return;
    try {
      const res = await fetch(previewDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setError('');
      alert('이미지가 클립보드에 복사되었습니다');
    } catch {
      setError('클립보드 복사 실패');
    }
  };

  const statusLabel: Record<PushStatus, string> = {
    idle: '',
    generating: 'AI 배너 생성 중...',
    previewing: '미리보기 렌더링 중...',
    pushing: 'Figma에 Push 중...',
    done: '완료',
    failed: '실패',
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Figma className="size-5" />
          Figma Integration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI 배너를 생성하고 Figma에 자동으로 Push합니다
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection */}
        {!connected ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Personal Access Token
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Figma &gt; Settings &gt; Personal access tokens에서 생성
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="figd_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={connect} disabled={!token.trim() || connecting}>
                  <Link2 className="size-4 mr-1.5" />
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                <span className="size-2 bg-green-500 rounded-full" />
                Figma 연결됨
              </span>
              <Button variant="ghost" size="sm" onClick={disconnect} className="text-xs h-7 gap-1">
                <Unlink className="size-3" />
                연결 해제
              </Button>
            </div>

            {/* Copy text (required) */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">카피 *</label>
              <Textarea
                placeholder="배너에 들어갈 카피 텍스트"
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                rows={3}
              />
            </div>

            {/* Reference / Notes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">레퍼런스 / 참고사항</label>
              <Textarea
                placeholder="디자인 스타일, 색상, 톤 등"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                rows={2}
              />
            </div>

            {/* Reference image upload */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">레퍼런스 이미지</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {referenceImage ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{referenceImageName}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeImage} className="h-7 w-7 p-0">
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 h-14 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  이미지 업로드
                </Button>
              )}
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">사이즈</label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Figma file URL (optional) */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Figma 파일 URL <span className="text-muted-foreground font-normal">(선택)</span>
              </label>
              <Input
                placeholder="https://www.figma.com/design/..."
                value={figmaFileUrl}
                onChange={(e) => setFigmaFileUrl(e.target.value)}
              />
            </div>

            {/* Generate & Push button */}
            <Button
              onClick={generateAndPush}
              disabled={!copy.trim() || pushStatus === 'generating' || pushStatus === 'pushing' || pushStatus === 'previewing'}
              className="w-full gap-2"
            >
              <Upload className="size-4" />
              {pushStatus === 'idle' || pushStatus === 'done' || pushStatus === 'failed'
                ? 'Generate & Push to Figma'
                : statusLabel[pushStatus]}
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Status indicator */}
        {pushStatus !== 'idle' && pushStatus !== 'done' && pushStatus !== 'failed' && (
          <div className="flex items-center gap-2 py-3 justify-center">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{statusLabel[pushStatus]}</span>
          </div>
        )}

        {/* Preview */}
        {previewDataUrl && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">미리보기</p>
              {bannerId && (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                  <a href={`/banner/${bannerId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3" />
                    전체 보기
                  </a>
                </Button>
              )}
            </div>
            <div ref={previewRef}>
              <img
                src={previewDataUrl}
                alt="Banner preview"
                className="w-full rounded-md border"
              />
            </div>

            {/* Push result or fallback */}
            <div className="flex gap-2">
              {figmaUrl ? (
                <Button variant="outline" size="sm" className="gap-1.5 flex-1" asChild>
                  <a href={figmaUrl} target="_blank" rel="noopener noreferrer">
                    <Figma className="size-3" />
                    Figma에서 보기
                  </a>
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 flex-1"
                onClick={copyToClipboard}
              >
                <Clipboard className="size-3" />
                클립보드 복사
              </Button>
            </div>
          </div>
        )}

        {/* Figma screenshot */}
        {figmaScreenshot && (
          <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-500" />
              <p className="text-sm font-medium">Figma 결과</p>
            </div>
            <img
              src={figmaScreenshot}
              alt="Figma result"
              className="w-full rounded-md border"
            />
          </div>
        )}

        {/* Push success indicator */}
        {pushStatus === 'done' && !figmaScreenshot && bannerId && (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CheckCircle2 className="size-4 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">배너가 생성되었습니다</p>
          </div>
        )}

        {/* Recent pushes */}
        {recentPushes.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowRecent(!showRecent)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showRecent ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              최근 Push ({recentPushes.length})
            </button>
            {showRecent && (
              <div className="mt-3 space-y-2">
                {recentPushes.map((push) => (
                  <div key={push.id} className="p-3 rounded-lg border bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{push.file_name || 'Local Banner'}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        push.status === 'done'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : push.status === 'failed'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {push.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {push.figma_url && (
                        <a
                          href={push.figma_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Figma className="size-3" />
                          Figma
                        </a>
                      )}
                      {push.banner_id && (
                        <a
                          href={`/banner/${push.banner_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" />
                          Banner
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(push.extracted_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
