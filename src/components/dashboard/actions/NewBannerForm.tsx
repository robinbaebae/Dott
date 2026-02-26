'use client';

import { useState, useRef } from 'react';
import { Loader2, Figma, Check } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { SectionTitle, Chip } from './shared';

const SIZES = ['1080x1080', '1200x628', '1080x1920', '600x200', '1920x1080'];

export default function NewBannerForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [copy, setCopy] = useState('');
  const [reference, setReference] = useState('');
  const [size, setSize] = useState('1080x1080');
  const [referenceImage, setReferenceImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [bannerId, setBannerId] = useState('');
  const [pushingFigma, setPushingFigma] = useState(false);
  const [figmaPushed, setFigmaPushed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!copy.trim()) return;
    setLoading(true);
    setPreviewHtml('');
    setBannerId('');
    try {
      const res = await fetch('/api/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, reference, size, referenceImage: referenceImage || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setBannerId(data.id);
        setPreviewHtml(data.html || '');
        onResult(
          '🎨 배너 생성',
          `배너가 생성되었습니다.\n\nSize: ${size}`
        );
        toast.success('배너가 생성되었습니다');
      } else {
        toast.error('배너 생성에 실패했습니다');
      }
    } catch {
      toast.error('배너 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleFigmaPush = async () => {
    if (!previewHtml) return;
    setPushingFigma(true);
    try {
      // Render HTML to PNG using a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;border:none;`;
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe');
      iframeDoc.open();
      iframeDoc.write(previewHtml);
      iframeDoc.close();

      // Wait for content to render
      await new Promise((r) => setTimeout(r, 500));

      const body = iframeDoc.body;
      const dataUrl = await toPng(body, { width: w, height: h, pixelRatio: 2 });
      document.body.removeChild(iframe);

      // Convert data URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Upload to auto-push queue
      const formData = new FormData();
      formData.append('image', new File([blob], 'banner.png', { type: 'image/png' }));
      formData.append('size', size);
      formData.append('prompt', copy);

      const pushRes = await fetch('/api/figma/auto-push', {
        method: 'POST',
        body: formData,
      });

      if (pushRes.ok) {
        setFigmaPushed(true);
        toast.success('Figma 플러그인으로 전송 대기 중');
      } else {
        const err = await pushRes.json();
        toast.error(err.error || 'Figma 전송에 실패했습니다');
      }
    } catch {
      toast.error('Figma 전송에 실패했습니다');
    } finally {
      setPushingFigma(false);
    }
  };

  // Calculate preview dimensions
  const [w, h] = size.split('x').map(Number);
  const scale = Math.min(480 / w, 300 / h, 1);
  const previewW = w * scale;
  const previewH = h * scale;

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>배너 카피 *</SectionTitle>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={3}
          placeholder="배너에 들어갈 텍스트를 입력하세요..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>사이즈</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <Chip key={s} label={s} active={size === s} onClick={() => setSize(s)} />
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>레퍼런스 참고사항</SectionTitle>
        <textarea
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          rows={2}
          placeholder="디자인 스타일, 분위기, 참고사항..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>레퍼런스 이미지</SectionTitle>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        {referenceImage ? (
          <div className="flex items-center gap-2">
            <img src={referenceImage} alt="ref" className="size-16 rounded-lg object-cover border border-border" />
            <button onClick={() => { setReferenceImage(''); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">삭제</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-accent/40 cursor-pointer">
            이미지 업로드
          </button>
        )}
      </div>
      <button
        onClick={handleGenerate}
        disabled={!copy.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate Banner'}
      </button>

      {/* Inline preview */}
      {previewHtml && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">배너 미리보기</span>
            <button
              onClick={handleFigmaPush}
              disabled={pushingFigma || figmaPushed}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium cursor-pointer disabled:opacity-60 ${
                figmaPushed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#5B4D6E]/10 text-[#5B4D6E] hover:bg-[#5B4D6E]/20'
              }`}
            >
              {pushingFigma ? (
                <><Loader2 className="size-3 animate-spin" /> 전송 중...</>
              ) : figmaPushed ? (
                <><Check className="size-3" /> Figma 전송됨</>
              ) : (
                <><Figma className="size-3" /> Figma로 보내기</>
              )}
            </button>
          </div>
          <div
            className="rounded-lg border border-border overflow-hidden bg-white mx-auto"
            style={{ width: previewW, height: previewH }}
          >
            <iframe
              srcDoc={previewHtml}
              title="Banner preview"
              style={{
                width: w,
                height: h,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 'none',
                display: 'block',
              }}
              className="pointer-events-none"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
