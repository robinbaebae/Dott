'use client';

import { useEffect, useState, useCallback } from 'react';
import KeywordTrendCard from '@/components/trends/KeywordTrendCard';
import IndustryCurationCard from '@/components/trends/IndustryCurationCard';
import CompetitorBriefingCard from '@/components/trends/CompetitorBriefingCard';
import CompetitorAdTrackingCard from '@/components/trends/CompetitorAdTrackingCard';

const SECTIONS = [
  { id: 'keyword-trends', label: '키워드 트렌드' },
  { id: 'industry-curation', label: '업계 큐레이션' },
  { id: 'competitor-briefing', label: '경쟁사 브리핑' },
  { id: 'ad-tracking', label: '광고 트래킹' },
];

export default function TrendsPage() {
  const [active, setActive] = useState('keyword-trends');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -50% 0px' }
    );
    const timer = setTimeout(() => {
      SECTIONS.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
      });
    }, 200);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActive(id);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-4">IT 마케팅 트렌드 분석 대시보드</p>

      {/* TOC */}
      <nav className="sticky top-[72px] z-40 -mx-6 px-6 py-3 bg-background/80 backdrop-blur-md border-b mb-8">
        <div className="flex gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                active === s.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-10">
        <section id="keyword-trends" className="scroll-mt-36">
          <KeywordTrendCard />
        </section>
        <section id="industry-curation" className="scroll-mt-36">
          <IndustryCurationCard />
        </section>
        <section id="competitor-briefing" className="scroll-mt-36">
          <CompetitorBriefingCard />
        </section>
        <section id="ad-tracking" className="scroll-mt-36">
          <CompetitorAdTrackingCard />
        </section>
      </div>
    </div>
  );
}
