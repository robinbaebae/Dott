'use client';

import dynamic from 'next/dynamic';

const DynamicMemoEditor = dynamic(
  () => import('@/components/memo/MemoEditor'),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">에디터 로딩 중...</div> }
);

export default DynamicMemoEditor;
