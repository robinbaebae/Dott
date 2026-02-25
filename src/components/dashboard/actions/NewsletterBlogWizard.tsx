'use client';

import { useState } from 'react';
import TopicSuggestForm from './TopicSuggestForm';
import BlogDraftForm from './BlogDraftForm';
import NewsletterDraftForm from './NewsletterDraftForm';

type WizardStep = 'suggest' | 'draft';

export default function NewsletterBlogWizard({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [step, setStep] = useState<WizardStep>('suggest');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [contentType, setContentType] = useState<'blog' | 'newsletter'>('blog');

  const handleTopicSelect = (title: string, type: 'blog' | 'newsletter') => {
    setSelectedTitle(title);
    setContentType(type);
    setStep('draft');
  };

  const handleBack = () => {
    setStep('suggest');
    setSelectedTitle('');
  };

  if (step === 'suggest') {
    return <TopicSuggestForm onSelect={handleTopicSelect} />;
  }

  if (contentType === 'blog') {
    return <BlogDraftForm title={selectedTitle} onResult={onResult} onBack={handleBack} />;
  }

  return <NewsletterDraftForm title={selectedTitle} onResult={onResult} onBack={handleBack} />;
}
