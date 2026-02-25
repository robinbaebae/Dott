import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';
import { BLOG_DRAFT_PROMPT, BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';
import { getBrandGuideContext } from '@/lib/brand-guide';

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const brandContext = await getBrandGuideContext(userEmail);

  const { title, existingDraft, revision } = await req.json();
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  try {
    // Build user message
    let userMessage: string;
    if (existingDraft && revision) {
      userMessage = `${brandContext ? brandContext + '\n\n' : ''}제목: ${title}

기존 초안:
${existingDraft}

수정 요청: ${revision}

수정 요청을 반영하여 블로그 초안을 다시 작성해주세요.`;
    } else {
      userMessage = `${brandContext ? brandContext + '\n\n' : ''}제목/주제: ${title}

이 주제로 블로그 초안을 작성해주세요.`;
    }

    // Generate blog draft + header image in parallel
    const [draftRaw, headerHtml] = await Promise.all([
      withTimeout(generateCompletion(BLOG_DRAFT_PROMPT, userMessage), 60000, '블로그 초안 생성 시간 초과'),
      withTimeout(
        generateCompletion(
          BANNER_GENERATION_PROMPT,
          `블로그 헤더이미지를 만들어주세요.\n제목: ${title}\n사이즈: 1200x628\n스타일: 깔끔하고 전문적인 블로그 헤더`
        ),
        45000,
        '헤더이미지 생성 시간 초과'
      ).catch(() => ''),
    ]);

    // Parse blog draft JSON
    let draft: { title: string; content: string; meta_description: string };
    try {
      const jsonMatch = draftRaw.match(/\{[\s\S]*\}/);
      draft = JSON.parse(jsonMatch ? jsonMatch[0] : draftRaw);
    } catch {
      draft = { title, content: draftRaw, meta_description: '' };
    }

    // Save header image as banner if generated
    let bannerId = '';
    if (headerHtml) {
      const { data } = await supabaseAdmin
        .from('banners')
        .insert({ copy: title, size: '1200x628', html: headerHtml, user_id: userEmail })
        .select('id')
        .single();
      if (data) bannerId = data.id;
    }

    await logActivity('blog_draft', 'marketing', { title, revision: !!revision });
    return NextResponse.json({ draft, headerHtml, bannerId });
  } catch (error) {
    console.error('Blog draft error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate blog draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
