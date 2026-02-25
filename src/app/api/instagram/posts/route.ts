import { NextResponse } from 'next/server';
import {
  getCachedPosts,
  fetchInstagramPosts,
  isInstagramConnected,
  disconnectInstagram,
} from '@/lib/instagram';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const connected = await isInstagramConnected(userEmail);
  if (!connected) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  const posts = await getCachedPosts(userEmail);
  return NextResponse.json({ connected: true, posts });
}

export async function POST() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const posts = await fetchInstagramPosts(userEmail);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Instagram fetch error:', error);
    return NextResponse.json(
      { error: '게시물을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  await disconnectInstagram(userEmail);
  return NextResponse.json({ ok: true });
}
