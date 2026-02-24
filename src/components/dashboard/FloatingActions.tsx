'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

export default function FloatingActions() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className={`flex flex-col gap-2 transition-all duration-300 ${
          expanded
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Link href="/">
          <Button variant="secondary" size="sm" className="shadow-lg gap-2 whitespace-nowrap">
            Dott에게 질문
          </Button>
        </Link>
        <Link href="/research">
          <Button variant="secondary" size="sm" className="shadow-lg gap-2 whitespace-nowrap">
            리서치
          </Button>
        </Link>
        <Link href="/create">
          <Button variant="secondary" size="sm" className="shadow-lg gap-2 whitespace-nowrap">
            콘텐츠 만들기
          </Button>
        </Link>
      </div>

      <Button
        size="icon"
        className="rounded-full size-12 shadow-lg"
      >
        <MessageCircle className="size-5" />
      </Button>
    </div>
  );
}
