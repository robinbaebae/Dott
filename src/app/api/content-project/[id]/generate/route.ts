import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { CONTENT_DRAFT_PROMPT, BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';
import { getBrandGuideContext } from '@/lib/brand-guide';

// POST — generate drafts + banner for selected idea
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;
    const apiKey = await getUserApiKey(userEmail);


    const { id } = await params;

    // Fetch project
    const { data: project, error: fetchErr } = await supabaseAdmin
      .from('content_projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userEmail)
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

    // Fetch brand guide for context
    const brandContext = await getBrandGuideContext(userEmail as string);

    // Generate platform-specific drafts
    const userMessage = `선택된 아이디어:
제목: ${idea.title}
핵심 메시지: ${idea.message}
예상 반응: ${idea.hook}

대상 플랫폼: ${platforms.join(', ')}
${brandContext || ''}

이 아이디어를 각 플랫폼에 맞게 콘텐츠를 작성해주세요.`;

    const draftResponse = await generateCompletion(apiKey, CONTENT_DRAFT_PROMPT, userMessage);

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
      const bannerUserMsg = `카피: "${bannerCopy}"\n참고: ${bannerRef}\n사이즈: 1080x1080\n${brandContext || '주요색상 #5B4D6E 퍼플 계열'}`;
      const bannerResult = await generateCompletion(apiKey, BANNER_GENERATION_PROMPT, bannerUserMsg);

      bannerHtml = bannerResult
        .replace(/^```html\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();

      // Save banner to DB
      const { data: banner } = await supabaseAdmin
        .from('banners')
        .insert({ copy: bannerCopy.slice(0, 100), reference: bannerRef, size: '1080x1080', html: bannerHtml, user_id: userEmail })
        .select()
        .single();

      if (banner) bannerId = banner.id;
    } catch (bannerErr) {
      console.error('Banner generation failed:', bannerErr);
    }

    // Update project with drafts
    const { data: updated, error: updateErr } = await supabaseAdmin
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
      .eq('user_id', userEmail)
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
