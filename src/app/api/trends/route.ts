import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreArticles, getArticles } from '@/lib/rss';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

// GET - 트렌드 아티클 목록 조회
export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? undefined;
    const since = searchParams.get('since') ?? undefined;
    const articles = await getArticles(category, since);
    return NextResponse.json(articles);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - RSS 수집 트리거
export async function POST() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const result = await fetchAndStoreArticles();
    await logActivity('trend_refresh', 'research', { inserted: result.inserted }, userEmail);
    return NextResponse.json({
      success: true,
      message: `${result.inserted}건 수집 완료 (총 ${result.total}건 확인)`,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
