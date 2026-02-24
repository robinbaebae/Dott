import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { CONTENT_DRAFT_PROMPT, BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';

// POST — generate drafts + banner for selected idea
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch project
    const { data: project, error: fetchErr } = await supabase
      .from('content_projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const ideaIndex = project.selected_idea_index ?? 0;
    const idea = project.ideas?.[ideaIndex];
    if (!idea) {
      return NextResponse.json({ error: 'No idea selected' }, { status: 400 });
    }

    const platforms = project.platforms || ['instagram', 'threads', 'blog'];

    // Generate platform-specific drafts
    const userMessage = `선택된 아이디어:
제목: ${idea.title}
핵심 메시지: ${idea.message}
예상 반응: ${idea.hook}

대상 플랫폼: ${platforms.join(', ')}
브랜드: 코드앤버터 (노코드 팝업/배너 SaaS)

이 아이디어를 각 플랫폼에 맞게 콘텐츠를 작성해주세요.`;

    const draftResponse = await generateCompletion(CONTENT_DRAFT_PROMPT, userMessage);

    let parsed: { drafts: Record<string, unknown>; explanation: string; banner_suggestion?: { copy: string; reference: string } };
    try {
      const jsonStr = draftResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback: use response as blog content
      parsed = {
        drafts: { blog: { content: draftResponse, title: idea.title } },
        explanation: '콘텐츠를 생성했습니다.',
      };
    }

    // Generate banner if suggestion exists
    let bannerHtml: string | null = null;
    let bannerId: string | null = null;

    const bannerCopy = parsed.banner_suggestion?.copy || idea.title;
    const bannerRef = parsed.banner_suggestion?.reference || '';

    try {
      const bannerPrompt = `${BANNER_GENERATION_PROMPT}\n\n---\nUser: 카피: "${bannerCopy}"\n참고: ${bannerRef}\n사이즈: 1080x1080\n브랜드: 코드앤버터, 주요색상 #5B4D6E 퍼플 계열`;
      const bannerResult = await generateCompletion(BANNER_GENERATION_PROMPT, `카피: "${bannerCopy}"\n참고: ${bannerRef}\n사이즈: 1080x1080\n브랜드: 코드앤버터, 주요색상 #5B4D6E 퍼플 계열`);

      bannerHtml = bannerResult
        .replace(/^```html\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();

      // Save banner to DB
      const { data: banner } = await supabase
        .from('banners')
        .insert({ copy: bannerCopy.slice(0, 100), reference: bannerRef, size: '1080x1080', html: bannerHtml })
        .select()
        .single();

      if (banner) bannerId = banner.id;
    } catch (bannerErr) {
      console.error('Banner generation failed:', bannerErr);
    }

    // Update project with drafts
    const { data: updated, error: updateErr } = await supabase
      .from('content_projects')
      .update({
        status: 'review',
        drafts: parsed.drafts,
        ai_explanation: parsed.explanation,
        banner_id: bannerId,
        banner_html: bannerHtml,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logActivity('content_drafts_generated', 'marketing', {
      projectId: id,
      platforms,
      hasBanner: !!bannerId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Content generate error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
