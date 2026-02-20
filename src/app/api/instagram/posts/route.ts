import { NextResponse } from 'next/server';
import {
  getCachedPosts,
  fetchInstagramPosts,
  isInstagramConnected,
  disconnectInstagram,
} from '@/lib/instagram';

export async function GET() {
  const connected = await isInstagramConnected();
  if (!connected) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  const posts = await getCachedPosts();
  return NextResponse.json({ connected: true, posts });
}

export async function POST() {
  try {
    const posts = await fetchInstagramPosts();
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
  await disconnectInstagram();
  return NextResponse.json({ ok: true });
}
