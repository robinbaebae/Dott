'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import DottPrompt from '@/components/dashboard/DottPrompt';
import SetupGuide from '@/components/dashboard/SetupGuide';
import LandingPage from '@/components/landing/LandingPage';

export default function Page() {
  const { data: session } = useSession();
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('dott-demo') === 'true') setIsDemo(true);
  }, []);

  if (!session && !isDemo) {
    return <LandingPage />;
  }

  return (
    <div className="relative min-h-full">
      {/* Gradient background */}
      <div className="fixed inset-0 -z-10 dashboard-gradient" />
      <div className="max-w-5xl mx-auto px-6 pt-2 pb-4 animate-in fade-in duration-500">
        {!isDemo && <SetupGuide />}
        <DottPrompt />
      </div>
    </div>
  );
}
