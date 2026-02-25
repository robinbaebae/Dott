import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { SEO_CONTENT_BRIEF_PROMPT } from '@/lib/prompts';
import { getBrandGuideContext } from '@/lib/brand-guide';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// GET — list SEO briefs
export async function GET(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { data, error } = await supabaseAdmin
      .from('seo_briefs')
      .select('*')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — generate SEO brief via AI
export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { topic } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const brandContext = await getBrandGuideContext(userEmail);
    const userMessage = `${brandContext ? brandContext + '\n\n' : ''}주제: "${topic}"\n\n이 주제에 대한 SEO 콘텐츠 브리프를 생성해주세요.`;

    const raw = await withTimeout(
      generateCompletion(SEO_CONTENT_BRIEF_PROMPT, userMessage),
      60000,
      'SEO 브리프 생성 시간 초과'
    );

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('seo_briefs')
      .insert({
        topic,
        primary_keyword: parsed.primary_keyword || '',
        secondary_keywords: parsed.secondary_keywords || [],
        search_intent: parsed.search_intent || '',
        title_tags: parsed.title_tags || [],
        meta_descriptions: parsed.meta_descriptions || [],
        content_outline: parsed.content_outline || [],
        internal_link_suggestions: parsed.internal_link_suggestions || [],
        competitor_notes: parsed.competitor_notes || '',
        word_count_estimate: parsed.word_count_estimate || 0,
        status: 'completed',
        user_id: userEmail,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('seo_brief_generate', null, { topic, primary_keyword: parsed.primary_keyword });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — update brief or send to compose
export async function PATCH(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const body = await req.json();
    const { id, action, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Send to compose — create a content project from the brief
    if (action === 'send_to_compose') {
      const { data: brief } = await supabaseAdmin
        .from('seo_briefs')
        .select('*')
        .eq('id', id)
        .single();

      if (!brief) {
        return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
      }

      // Map outline sections to key_points for the content project
      const outlineSections = (brief.content_outline as Array<{ heading: string; description: string }>) || [];
      const keyPoints = outlineSections.map(
        (s: { heading: string; description: string }) => `${s.heading}: ${s.description}`
      );

      const { data: project, error: projError } = await supabaseAdmin
        .from('content_projects')
        .insert({
          topic: brief.topic,
          platforms: ['blog'],
          status: 'topic_selected',
          ideas: [],
          materials: [{
            title: brief.topic,
            approach: `SEO 브리프 기반 콘텐츠 (키워드: ${brief.primary_keyword})`,
            key_points: keyPoints,
            platform_fit: { blog: 5 },
            engagement_reason: `SEO 최적화 콘텐츠 - 타겟 키워드: ${brief.primary_keyword}`,
            header_images: [],
          }],
          selected_idea_index: 0,
          ai_explanation: `SEO 브리프에서 생성된 프로젝트입니다. 주요 키워드: ${brief.primary_keyword}`,
          user_id: userEmail,
        })
        .select()
        .single();

      if (projError) throw projError;

      // Update brief status
      await supabaseAdmin
        .from('seo_briefs')
        .update({ status: 'sent_to_compose', sent_to_project_id: project.id, updated_at: new Date().toISOString() })
        .eq('id', id);

      await logActivity('seo_brief_to_compose', null, { brief_id: id, project_id: project.id });
      return NextResponse.json({ brief_id: id, project_id: project.id });
    }

    // Regular field update
    const { data, error } = await supabaseAdmin
      .from('seo_briefs')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('seo_briefs')
      .delete()
      .eq('id', id)
      .eq('user_id', userEmail);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
