'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Chat Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
      <AlertCircle className="w-12 h-12 text-destructive" />
      <h2 className="text-lg font-medium">채팅을 불러올 수 없습니다</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {error.message || '채팅 서비스에 연결할 수 없습니다.'}
      </p>
      <Button variant="outline" onClick={reset} className="gap-2">
        <RotateCcw className="w-4 h-4" />
        다시 시도
      </Button>
    </div>
  );
}
