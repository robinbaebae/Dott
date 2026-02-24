'use client';

import { useSession } from 'next-auth/react';
import DottPrompt from '@/components/dashboard/DottPrompt';
import LandingPage from '@/components/landing/LandingPage';

export default function Page() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground text-sm">로딩 중</div>
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-in fade-in duration-500">
      <DottPrompt />
    </div>
  );
}
