import { NextResponse } from 'next/server';
import {
  getCachedThreadsPosts,
  fetchThreadsPosts,
  isThreadsConnected,
  disconnectThreads,
} from '@/lib/threads';

export async function GET() {
  const connected = await isThreadsConnected();
  if (!connected) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  const posts = await getCachedThreadsPosts();
  return NextResponse.json({ connected: true, posts });
}

export async function POST() {
  try {
    const posts = await fetchThreadsPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Threads fetch error:', error);
    return NextResponse.json(
      { error: '게시물을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await disconnectThreads();
  return NextResponse.json({ ok: true });
}
