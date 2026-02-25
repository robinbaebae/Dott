'use client';

import type { QuickActionCategory } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { SegmentedTabs } from './actions/shared';
import { useState } from 'react';
import { useBrandGuide } from '@/hooks/useBrandGuide';

// Sub-tool forms
import CaptionForm from './actions/CaptionForm';
import RepurposeResizeForm from './actions/RepurposeResizeForm';
import UtmForm from './actions/UtmForm';
import HashtagGeneratorForm from './actions/HashtagGeneratorForm';
import NewBannerForm from './actions/NewBannerForm';
import NewCopyForm from './actions/NewCopyForm';
import NewsletterBlogWizard from './actions/NewsletterBlogWizard';
import EmailComposeForm from './actions/EmailComposeForm';

const CATEGORY_LABELS: Record<QuickActionCategory, string> = {
  'content-tools': '콘텐츠 도구',
  'ad-banner-copy': '광고 배너 & 카피',
  'newsletter-blog': '뉴스레터 & 블로그',
  'email-compose': '이메일',
};

interface ActionPanelProps {
  action: QuickActionCategory;
  onResult: (userLabel: string, content: string) => void;
  onClose: () => void;
}

export default function ActionPanel({ action, onResult, onClose }: ActionPanelProps) {
  const { hasBrandGuide, brandName } = useBrandGuide();

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
        <span className="text-sm font-medium">{CATEGORY_LABELS[action]}</span>
        {hasBrandGuide && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
            {brandName} 가이드 적용됨
          </span>
        )}
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5">
        {action === 'content-tools' && <ContentToolsDispatcher onResult={onResult} />}
        {action === 'ad-banner-copy' && <AdBannerCopyDispatcher onResult={onResult} />}
        {action === 'newsletter-blog' && <NewsletterBlogWizard onResult={onResult} />}
        {action === 'email-compose' && <EmailComposeForm onResult={onResult} />}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Content Tools Dispatcher                                            */
/* ================================================================== */

function ContentToolsDispatcher({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [tab, setTab] = useState('caption');

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { key: 'caption', label: '캡션' },
          { key: 'repurpose', label: '리퍼포징' },
          { key: 'utm', label: 'UTM' },
          { key: 'hashtag', label: '해시태그' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'caption' && <CaptionForm onResult={onResult} />}
      {tab === 'repurpose' && <RepurposeResizeForm onResult={onResult} />}
      {tab === 'utm' && <UtmForm onResult={onResult} />}
      {tab === 'hashtag' && <HashtagGeneratorForm onResult={onResult} />}
    </div>
  );
}

/* ================================================================== */
/* Ad Banner & Copy Dispatcher                                         */
/* ================================================================== */

function AdBannerCopyDispatcher({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [tab, setTab] = useState('banner');

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { key: 'banner', label: '새 배너' },
          { key: 'copy', label: '새 카피' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'banner' && <NewBannerForm onResult={onResult} />}
      {tab === 'copy' && <NewCopyForm onResult={onResult} />}
    </div>
  );
}
