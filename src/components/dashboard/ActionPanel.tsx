'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import type { QuickActionType } from '@/types';
import {
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import ContentCalendar from '@/components/content/ContentCalendar';
import ContentWorkflow from '@/components/content/ContentWorkflow';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground block mb-1.5">{children}</label>;
}

function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
        active
          ? color ?? 'bg-accent text-accent-foreground border-accent'
          : 'bg-card text-muted-foreground border-border hover:border-accent/40'
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* ACTION TITLES                                                       */
/* ------------------------------------------------------------------ */

const ACTION_LABELS: Record<QuickActionType, string> = {
  template: '콘텐츠 도구',
  email: '이메일',
  repurpose: '리퍼포징',
  'ad-copy': '광고 카피',
  utm: 'UTM 링크',
  banner: '배너',
  'ad-banner': '광고 배너',
  calendar: '캘린더',
  content: '콘텐츠 제작',
};

/* ================================================================== */
/* ActionPanel                                                         */
/* ================================================================== */

interface ActionPanelProps {
  action: QuickActionType;
  onResult: (userLabel: string, content: string) => void;
  onClose: () => void;
}

export default function ActionPanel({ action, onResult, onClose }: ActionPanelProps) {
  return (
    <div className="w-full animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-medium">{ACTION_LABELS[action]}</span>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5">
        {action === 'template' && <TemplateRepurposeForm onResult={onResult} />}
        {action === 'email' && <EmailForm onResult={onResult} />}
        {action === 'repurpose' && <RepurposeForm onResult={onResult} />}
        {action === 'ad-copy' && <AdCopyForm onResult={onResult} />}
        {action === 'utm' && <UtmForm onResult={onResult} />}
        {action === 'banner' && <BannerCombinedForm onResult={onResult} />}
        {action === 'ad-banner' && <AdBannerForm onResult={onResult} />}
        {action === 'content' && <ContentWorkflow onResult={onResult} />}
        {action === 'calendar' && <ContentCalendar />}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Segmented Tab helper                                                */
/* ================================================================== */

function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted/50 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 px-3 py-2 rounded-md text-sm transition-all cursor-pointer ${
            active === t.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/* TEMPLATE + REPURPOSE (merged)                                       */
/* ================================================================== */

function TemplateRepurposeForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [mode, setMode] = useState<string>('template');

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { key: 'template', label: '템플릿 생성' },
          { key: 'repurpose', label: '리퍼포징' },
        ]}
        active={mode}
        onChange={setMode}
      />
      {mode === 'template' ? (
        <TemplateForm onResult={onResult} />
      ) : (
        <RepurposeForm onResult={onResult} />
      )}
    </div>
  );
}

/* ================================================================== */
/* BANNER + AD BANNER (merged)                                         */
/* ================================================================== */

function BannerCombinedForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [mode, setMode] = useState<string>('create');

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { key: 'create', label: '새 배너 생성' },
          { key: 'resize', label: '사이즈 변환' },
        ]}
        active={mode}
        onChange={setMode}
      />
      {mode === 'create' ? (
        <BannerForm onResult={onResult} />
      ) : (
        <AdBannerForm onResult={onResult} />
      )}
    </div>
  );
}

/* ================================================================== */
/* TEMPLATE                                                            */
/* ================================================================== */

interface Template {
  id: string;
  name: string;
  variables: string[];
}

const CATEGORIES: { label: string; color: string; templates: Template[] }[] = [
  {
    label: 'SNS',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    templates: [
      { id: 'instagram-caption', name: 'Instagram Caption', variables: ['topic', 'tone', 'target_audience'] },
      { id: 'threads-post', name: 'Threads Post', variables: ['topic', 'key_message'] },
      { id: 'hashtag-generator', name: 'Hashtag Generator', variables: ['topic', 'industry'] },
    ],
  },
  {
    label: 'Ads',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    templates: [
      { id: 'ad-headline', name: 'Ad Headline', variables: ['product', 'benefit', 'target_audience'] },
      { id: 'cta-generator', name: 'CTA Generator', variables: ['product', 'goal'] },
      { id: 'product-description', name: 'Product Description', variables: ['product', 'features', 'target_audience'] },
    ],
  },
  {
    label: 'Email',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    templates: [
      { id: 'newsletter-subject', name: 'Newsletter Subject', variables: ['topic', 'newsletter_name'] },
      { id: 'newsletter-body', name: 'Newsletter Body', variables: ['topic', 'key_points', 'cta_goal'] },
      { id: 'email-cta', name: 'Email CTA', variables: ['goal', 'offer'] },
    ],
  },
  {
    label: 'Blog',
    color: 'bg-green-100 text-green-800 border-green-200',
    templates: [
      { id: 'blog-title', name: 'Blog Title', variables: ['topic', 'keyword'] },
      { id: 'blog-outline', name: 'Blog Outline', variables: ['topic', 'keyword', 'target_audience'] },
      { id: 'blog-intro', name: 'Blog Intro', variables: ['topic', 'target_audience'] },
    ],
  },
];

const VARIABLE_LABELS: Record<string, string> = {
  topic: 'Topic / Subject',
  tone: 'Tone (e.g. casual, professional)',
  target_audience: 'Target Audience',
  key_message: 'Key Message',
  industry: 'Industry',
  product: 'Product / Service',
  benefit: 'Key Benefit',
  features: 'Features',
  goal: 'Goal',
  offer: 'Offer / Promotion',
  newsletter_name: 'Newsletter Name',
  key_points: 'Key Points',
  cta_goal: 'CTA Goal',
  keyword: 'SEO Keyword',
};

function TemplateForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [catIdx, setCatIdx] = useState<number | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!template) return;
    setLoading(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, variables: vars }),
      });
      if (res.ok) {
        const data = await res.json();
        onResult(`📝 ${template.name}`, data.result);
        toast.success('템플릿이 생성되었습니다');
      } else {
        toast.error('템플릿 생성에 실패했습니다');
      }
    } catch {
      toast.error('템플릿 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Category
  if (catIdx === null) {
    return (
      <div className="space-y-3">
        <SectionTitle>카테고리 선택</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c, i) => (
            <Chip key={c.label} label={c.label} active={false} color={c.color} onClick={() => setCatIdx(i)} />
          ))}
        </div>
      </div>
    );
  }

  const cat = CATEGORIES[catIdx];

  // Step 2: Template
  if (!template) {
    return (
      <div className="space-y-3">
        <SectionTitle>{cat.label} 템플릿 선택</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {cat.templates.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              active={false}
              onClick={() => {
                setTemplate(t);
                setVars(Object.fromEntries(t.variables.map((v) => [v, ''])));
              }}
            />
          ))}
        </div>
        <button
          onClick={() => setCatIdx(null)}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          ← 카테고리 변경
        </button>
      </div>
    );
  }

  // Step 3: Variables + Generate
  const allFilled = template.variables.every((v) => vars[v]?.trim());

  return (
    <div className="space-y-3">
      <SectionTitle>{template.name}</SectionTitle>
      {template.variables.map((v) => (
        <div key={v}>
          <label className="text-xs text-muted-foreground mb-1 block">
            {VARIABLE_LABELS[v] ?? v}
          </label>
          <input
            type="text"
            value={vars[v] ?? ''}
            onChange={(e) => setVars((p) => ({ ...p, [v]: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      ))}
      <button
        onClick={handleGenerate}
        disabled={!allFilled || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate'}
      </button>
      <button
        onClick={() => setTemplate(null)}
        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
      >
        ← 템플릿 변경
      </button>
    </div>
  );
}

/* ================================================================== */
/* EMAIL                                                               */
/* ================================================================== */

function EmailForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [to, setTo] = useState('');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);

  const tones = ['professional', 'casual', 'friendly', 'urgent'];

  const handleGenerate = async () => {
    if (!to.trim() || !topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', to, topic, details, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        onResult(
          '📧 이메일 작성',
          `**To:** ${to}\n**Subject:** ${data.subject}\n\n${data.body_html?.replace(/<[^>]*>/g, '') ?? data.body_html}`
        );
        toast.success('이메일이 생성되었습니다');
      } else {
        toast.error('이메일 생성에 실패했습니다');
      }
    } catch {
      toast.error('이메일 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>To</SectionTitle>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient@example.com"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>Subject / Topic</SectionTitle>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="이메일 주제"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>Details</SectionTitle>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="추가 내용이나 요점"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>Tone</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {tones.map((t) => (
            <Chip key={t} label={t} active={tone === t} onClick={() => setTone(t)} />
          ))}
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={!to.trim() || !topic.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate'}
      </button>
    </div>
  );
}

/* ================================================================== */
/* REPURPOSE                                                           */
/* ================================================================== */

const PLATFORMS = ['blog', 'instagram', 'threads', 'newsletter', 'linkedin', 'twitter'];

function RepurposeForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('blog');
  const [targets, setTargets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTarget = (p: string) =>
    setTargets((prev) => (prev.includes(p) ? prev.filter((t) => t !== p) : [...prev, p]));

  const handleGenerate = async () => {
    if (!content.trim() || targets.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, sourceFormat: source, targetFormats: targets }),
      });
      if (res.ok) {
        const data: { platform: string; content: string }[] = await res.json();
        const text = data.map((d) => `**[${d.platform}]**\n${d.content}`).join('\n\n---\n\n');
        onResult('🔄 콘텐츠 리퍼포징', text);
        toast.success('콘텐츠가 변환되었습니다');
      } else {
        toast.error('리퍼포징에 실패했습니다');
      }
    } catch {
      toast.error('리퍼포징에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>원본 콘텐츠</SectionTitle>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="변환할 원본 콘텐츠를 붙여넣기 하세요..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>소스 플랫폼</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Chip key={p} label={p} active={source === p} onClick={() => { setSource(p); setTargets((prev) => prev.filter((t) => t !== p)); }} />
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>타겟 플랫폼</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.filter((p) => p !== source).map((p) => (
            <Chip key={p} label={p} active={targets.includes(p)} onClick={() => toggleTarget(p)} />
          ))}
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={!content.trim() || targets.length === 0 || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 변환 중...</> : 'Repurpose'}
      </button>
    </div>
  );
}

/* ================================================================== */
/* AD COPY                                                             */
/* ================================================================== */

function AdCopyForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [copy, setCopy] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!copy.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy }),
      });
      if (res.ok) {
        const data: { headline: string; body: string; tone: string }[] = await res.json();
        const text = data
          .map((v) => `**[${v.tone}]**\n**${v.headline}**\n${v.body}`)
          .join('\n\n---\n\n');
        onResult('📊 광고 카피 변형', text);
        toast.success('광고 카피가 생성되었습니다');
      } else {
        toast.error('광고 카피 생성에 실패했습니다');
      }
    } catch {
      toast.error('광고 카피 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>제품 설명 / 광고 카피</SectionTitle>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={4}
          placeholder="제품 설명, 광고 카피, 또는 핵심 메시지를 입력하세요..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <button
        onClick={handleGenerate}
        disabled={!copy.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate Variations'}
      </button>
    </div>
  );
}

/* ================================================================== */
/* UTM                                                                 */
/* ================================================================== */

function UtmForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const buildUrl = () => {
    if (!baseUrl.trim() || !source.trim() || !medium.trim() || !campaign.trim()) return '';
    try {
      const raw = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      const url = new URL(raw);
      url.searchParams.set('utm_source', source);
      url.searchParams.set('utm_medium', medium);
      url.searchParams.set('utm_campaign', campaign);
      if (term.trim()) url.searchParams.set('utm_term', term);
      if (content.trim()) url.searchParams.set('utm_content', content);
      customParams.forEach((p) => {
        if (p.key.trim() && p.value.trim()) url.searchParams.set(p.key, p.value);
      });
      return url.toString();
    } catch {
      return '';
    }
  };

  const generatedUrl = buildUrl();

  const handleCopyAndInject = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onResult('🔗 UTM 링크 생성', generatedUrl);
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>Base URL *</SectionTitle>
        <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://example.com" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <SectionTitle>Source *</SectionTitle>
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="google" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <SectionTitle>Medium *</SectionTitle>
          <input type="text" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="cpc" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <SectionTitle>Campaign *</SectionTitle>
          <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="spring_sale" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SectionTitle>Term</SectionTitle>
          <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="running+shoes" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <SectionTitle>Content</SectionTitle>
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="logolink" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Custom params */}
      {customParams.map((p, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1">
            <input type="text" value={p.key} onChange={(e) => setCustomParams((prev) => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="key" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1">
            <input type="text" value={p.value} onChange={(e) => setCustomParams((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="value" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={() => setCustomParams((prev) => prev.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-muted cursor-pointer">
            <Trash2 className="size-4 text-muted-foreground" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setCustomParams((prev) => [...prev, { key: '', value: '' }])}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
      >
        <Plus className="size-3" /> 커스텀 파라미터 추가
      </button>

      {generatedUrl && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs break-all font-mono text-foreground">
          {generatedUrl}
        </div>
      )}

      <button
        onClick={handleCopyAndInject}
        disabled={!generatedUrl}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {copied ? <><Check className="size-4" /> 복사됨!</> : <><Copy className="size-4" /> 복사 & 채팅에 추가</>}
      </button>
    </div>
  );
}

/* ================================================================== */
/* BANNER                                                              */
/* ================================================================== */

function BannerForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [copy, setCopy] = useState('');
  const [reference, setReference] = useState('');
  const [size, setSize] = useState('1080x1080');
  const [referenceImage, setReferenceImage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sizes = ['1080x1080', '1200x628', '1080x1920'];

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
    try {
      const res = await fetch('/api/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, reference, size, referenceImage: referenceImage || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        onResult(
          '🎨 배너 생성',
          `배너가 생성되었습니다.\n\n[배너 미리보기 →](/banner/${data.id})\n\nSize: ${size}`
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
        <div className="flex gap-2">
          {sizes.map((s) => (
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
    </div>
  );
}

/* ================================================================== */
/* AD BANNER                                                           */
/* ================================================================== */

const GDN_SIZES: { group: string; sizes: string[] }[] = [
  { group: 'Popular', sizes: ['300x250', '336x280', '728x90', '300x600'] },
  { group: 'Mobile', sizes: ['320x50', '320x100'] },
  { group: 'Other', sizes: ['160x600', '468x60', '970x90', '970x250', '250x250', '200x200'] },
];

function AdBannerForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [sourceImage, setSourceImage] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSize = (s: string) =>
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const handleGenerate = async () => {
    if (!sourceImage || selectedSizes.size === 0) return;
    setLoading(true);
    try {
      const results: string[] = [];
      for (const size of Array.from(selectedSizes)) {
        try {
          const res = await fetch('/api/banner/variation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: sourceImage, targetSize: size }),
          });
          if (res.ok) {
            const data = await res.json();
            results.push(`**${size}** → [미리보기](/banner/${data.id})`);
          }
        } catch { /* skip individual failure */ }
      }
      if (results.length > 0) {
        onResult('📐 광고 배너 변환', `GDN 사이즈 변환 완료:\n\n${results.join('\n')}`);
        toast.success(`${results.length}개 배너가 생성되었습니다`);
      } else {
        toast.error('배너 변환에 실패했습니다');
      }
    } catch {
      toast.error('배너 변환에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>소스 배너 이미지 *</SectionTitle>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        {sourceImage ? (
          <div className="flex items-center gap-3">
            <img src={sourceImage} alt="source" className="h-20 rounded-lg object-contain border border-border" />
            <button onClick={() => { setSourceImage(''); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">삭제</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-accent/40 cursor-pointer">
            이미지 업로드
          </button>
        )}
      </div>
      <div>
        <SectionTitle>GDN 사이즈 선택</SectionTitle>
        {GDN_SIZES.map((g) => (
          <div key={g.group} className="mb-2">
            <span className="text-xs text-muted-foreground">{g.group}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {g.sizes.map((s) => (
                <Chip key={s} label={s} active={selectedSizes.has(s)} onClick={() => toggleSize(s)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleGenerate}
        disabled={!sourceImage || selectedSizes.size === 0 || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 변환 중 ({selectedSizes.size}개)...</> : `Generate ${selectedSizes.size}개 변형`}
      </button>
    </div>
  );
}
