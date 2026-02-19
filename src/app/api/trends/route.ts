import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreArticles, getArticles } from '@/lib/rss';

// GET - 트렌드 아티클 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? undefined;
    const articles = await getArticles(category);
    return NextResponse.json(articles);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - RSS 수집 트리거
export async function POST() {
  try {
    const result = await fetchAndStoreArticles();
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
