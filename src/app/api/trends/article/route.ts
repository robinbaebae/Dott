import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { fetchArticleContent } from '@/lib/article-parser';

// GET — 기사 콘텐츠 조회 (DB 캐시)
export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('trend_articles')
      .select('id, title, link, source, category, pub_date, content_text, content_html, og_image, fetched_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — 기사 본문 파싱 + 캐시 저장
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Check existing
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('trend_articles')
      .select('id, title, link, source, category, pub_date, content_text, content_html, og_image, fetched_at')
      .eq('id', id)
      .single();

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // If already fetched, return cached
    if (article.content_text && article.fetched_at) {
      return NextResponse.json(article);
    }

    // Fetch and parse article content
    const content = await fetchArticleContent(article.link);

    // Update DB
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('trend_articles')
      .update({
        content_text: content.content_text,
        content_html: content.content_html,
        og_image: content.og_image,
        fetched_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, title, link, source, category, pub_date, content_text, content_html, og_image, fetched_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
