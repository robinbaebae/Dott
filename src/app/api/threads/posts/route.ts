import { NextResponse } from 'next/server';
import {
  getCachedThreadsPosts,
  fetchThreadsPosts,
  isThreadsConnected,
  disconnectThreads,
} from '@/lib/threads';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const connected = await isThreadsConnected(userEmail);
  if (!connected) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  const posts = await getCachedThreadsPosts(userEmail);
  return NextResponse.json({ connected: true, posts });
}

export async function POST() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const posts = await fetchThreadsPosts(userEmail);
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
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  await disconnectThreads(userEmail);
  return NextResponse.json({ ok: true });
}
