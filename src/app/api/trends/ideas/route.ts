import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { requireAuth } from '@/lib/auth-guard';

const IDEA_PROMPT = `당신은 마케팅 콘텐츠 전략가입니다.
주어진 오늘의 트렌드 요약과 최근 기사 제목을 바탕으로,
마케터가 바로 활용할 수 있는 콘텐츠 아이디어 5개를 제안합니다.

규칙:
- 각 아이디어는 트렌드를 활용한 실행 가능한 콘텐츠
- 플랫폼별 적합도를 표시 (blog, instagram, linkedin, newsletter)
- 한국어로 작성
- 반드시 순수 JSON만 반환

형식:
[{"title":"콘텐츠 제목","description":"1줄 설명","platform":"가장 적합한 플랫폼","hook":"도입부 한 줄","based_on":"어떤 트렌드 기반인지"}]`;

export async function POST() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const apiKey = await getUserApiKey(userEmail);

    // Get today's summary
    const today = new Date().toISOString().split('T')[0];
    const { data: summary } = await supabaseAdmin
      .from('trend_summaries')
      .select('summary_text')
      .eq('summary_date', today)
      .single();

    // Get recent article titles
    const { data: articles } = await supabaseAdmin
      .from('trend_articles')
      .select('title, category')
      .order('pub_date', { ascending: false })
      .limit(20);

    if (!summary && (!articles || articles.length === 0)) {
      return NextResponse.json({ error: '트렌드 데이터가 없습니다. 먼저 뉴스를 수집해주세요.' }, { status: 400 });
    }

    const context = [
      summary ? `[오늘의 트렌드 요약]\n${summary.summary_text}` : '',
      articles && articles.length > 0
        ? `[최근 기사 제목]\n${articles.map((a, i) => `${i + 1}. [${a.category}] ${a.title}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    const result = await generateCompletion(
      apiKey,
      IDEA_PROMPT,
      context,
    );

    // Parse JSON from response
    const jsonStr = result.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
    const ideas = JSON.parse(jsonStr);

    return NextResponse.json(ideas);
  } catch (err) {
    console.error('POST /api/trends/ideas error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate ideas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
