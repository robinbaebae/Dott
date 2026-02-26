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
  Zap,
} from 'lucide-react';
import type { FigmaPush } from '@/types';

const SIZES = [
  { value: '1080x1080', label: 'Square (1080x1080)' },
  { value: '1200x628', label: 'Facebook/LinkedIn (1200x628)' },
  { value: '1080x1920', label: 'Story/Reels (1080x1920)' },
];

type PushStatus = 'idle' | 'generating' | 'previewing' | 'pushing' | 'done' | 'done-local' | 'failed';

export default function FigmaIntegration() {
  // Connection & setup
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pluginConfirmed, setPluginConfirmed] = useState(false);

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
    let iframe: HTMLIFrameElement | null = null;
    try {
      setPushStatus('previewing');
      // Fetch the banner HTML
      const res = await fetch(`/api/banner?id=${id}`);
      if (!res.ok) return;
      const banner = await res.json();

      // Render to image using html-to-image via hidden iframe approach
      const [w, h] = (banner.size || '1080x1080').split('x').map(Number);
      iframe = document.createElement('iframe');
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

      if (blob) {
        // Revoke previous blob URL to prevent memory leak
        setPreviewDataUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      }
    } catch (err) {
      console.error('Preview rendering failed:', err);
    } finally {
      // Always clean up iframe
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
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
        // No Electron or no file key — show preview only (not pushed to Figma)
        setPushStatus('done-local');
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
    done: 'Figma Push 완료',
    'done-local': '배너 생성 완료',
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
          <div className="space-y-5">
            {/* Step-by-step guide */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Figma className="size-4" />
                Figma 연동 가이드
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-medium">Figma 계정 로그인</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <a href="https://www.figma.com/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        figma.com <ExternalLink className="size-3" />
                      </a>
                      에 접속하여 로그인하세요. 계정이 없다면 무료로 가입할 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-medium">Personal Access Token 생성</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Figma 좌측 상단 프로필 아이콘 →{' '}
                      <span className="font-medium text-foreground/80">Settings</span> →{' '}
                      <span className="font-medium text-foreground/80">Security</span> 탭 →{' '}
                      <span className="font-medium text-foreground/80">Personal access tokens</span> →{' '}
                      <span className="font-medium text-foreground/80">Generate new token</span>
                    </p>
                    <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        💡 토큰 생성 시 <span className="font-medium text-foreground/70">File content</span> 권한을{' '}
                        <span className="font-medium text-foreground/70">Read and write</span>로 설정하세요.
                        토큰은 <code className="px-1 py-0.5 rounded bg-muted text-[11px]">figd_</code>로 시작합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                  <div>
                    <p className="text-sm font-medium">아래에 토큰 입력 후 연결</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      생성된 토큰을 복사하여 아래에 붙여넣고 Connect 버튼을 누르세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Token input */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Personal Access Token
              </label>
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

            {/* Auto-push plugin guide */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="size-4" />
                자동 Push 플러그인 (선택)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Figma 플러그인을 설치하면, Dott에서 생성한 배너가 Figma 파일에 자동으로 배치됩니다.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0">1.</span>
                  <p className="text-xs text-muted-foreground">
                    Figma 상단 메뉴 →{' '}
                    <span className="font-medium text-foreground/80">Plugins</span> →{' '}
                    <span className="font-medium text-foreground/80">Development</span> →{' '}
                    <span className="font-medium text-foreground/80">Import plugin from manifest</span>
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0">2.</span>
                  <p className="text-xs text-muted-foreground">
                    프로젝트 폴더 내{' '}
                    <code className="px-1 py-0.5 rounded bg-muted text-[11px]">figma-plugin/manifest.json</code> 선택
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0">3.</span>
                  <p className="text-xs text-muted-foreground">
                    플러그인 실행 후 서버 URL과 이메일을 입력하면 자동 Push가 활성화됩니다
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                <span className="size-2 bg-green-500 rounded-full animate-pulse" />
                Figma 연결됨
              </span>
              <Button variant="ghost" size="sm" onClick={disconnect} className="text-xs h-7 gap-1">
                <Unlink className="size-3" />
                연결 해제
              </Button>
            </div>

            {/* Plugin setup reminder (collapsible) */}
            {!pluginConfirmed && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Zap className="size-4" />
                    자동 Push 플러그인을 설치하셨나요?
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPluginConfirmed(true)}
                    className="h-6 w-6 p-0 shrink-0"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Figma 플러그인을 설치하면 배너를 생성할 때 Figma 파일에 자동 배치됩니다. 미설치 시 이미지 다운로드/복사만 가능합니다.
                </p>
                <details className="group">
                  <summary className="text-xs font-medium text-amber-800 dark:text-amber-300 cursor-pointer select-none flex items-center gap-1">
                    <ChevronDown className="size-3 group-open:rotate-180 transition-transform" />
                    플러그인 설치 방법 보기
                  </summary>
                  <div className="mt-2.5 space-y-2 pl-4 border-l-2 border-amber-200 dark:border-amber-800">
                    <div className="flex gap-2.5 items-start">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Figma 데스크톱 앱에서 파일을 열고, 상단 메뉴 →{' '}
                        <span className="font-semibold">Plugins</span> →{' '}
                        <span className="font-semibold">Development</span> →{' '}
                        <span className="font-semibold">Import plugin from manifest...</span>
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Dott 프로젝트 폴더 →{' '}
                        <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-[11px] font-mono">figma-plugin/manifest.json</code>{' '}
                        파일을 선택
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Plugins → Development →{' '}
                        <span className="font-semibold">Dott Auto Push</span> 실행
                      </p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center justify-center mt-0.5">4</span>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Server URL에{' '}
                        <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-[11px] font-mono">http://localhost:3000</code>,{' '}
                        Email에 로그인한 이메일 입력 → <span className="font-semibold">Connect</span>
                      </p>
                    </div>
                  </div>
                </details>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPluginConfirmed(true)}
                  className="text-xs h-7 gap-1"
                >
                  <CheckCircle2 className="size-3" />
                  설치 완료 / 나중에 하기
                </Button>
              </div>
            )}

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
              {pushStatus === 'idle' || pushStatus === 'done' || pushStatus === 'done-local' || pushStatus === 'failed'
                ? (figmaFileUrl.trim() ? 'Generate & Push to Figma' : '배너 생성하기')
                : statusLabel[pushStatus]}
            </Button>
            {!figmaFileUrl.trim() && (
              <p className="text-xs text-muted-foreground text-center">
                Figma 파일 URL을 입력하면 자동으로 Figma에 Push됩니다
              </p>
            )}
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
        {pushStatus !== 'idle' && pushStatus !== 'done' && pushStatus !== 'done-local' && pushStatus !== 'failed' && (
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
            <p className="text-sm text-green-700 dark:text-green-400">Figma에 Push 완료되었습니다</p>
          </div>
        )}

        {/* Local-only success (no Figma push) */}
        {pushStatus === 'done-local' && bannerId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CheckCircle2 className="size-4 text-blue-500" />
              <p className="text-sm text-blue-700 dark:text-blue-400">배너가 생성되었습니다 (Figma Push 안 됨)</p>
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Figma에 자동 Push하려면 위 Figma 파일 URL을 입력하거나, 자동 Push 플러그인을 설치하세요.
            </p>
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
