import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { CONTENT_IDEA_PROMPT, CONTENT_DRAFT_PROMPT, BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';

// GET — list content projects
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('content_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create project + generate ideas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, platforms } = body;

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const selectedPlatforms = platforms?.length ? platforms : ['instagram', 'threads', 'blog'];

    // Generate content ideas via AI
    const userMessage = `주제: "${topic}"\n대상 플랫폼: ${selectedPlatforms.join(', ')}\n\n이 주제에 대한 콘텐츠 아이디어를 제안해주세요.`;
    const aiResponse = await withTimeout(
      generateCompletion(CONTENT_IDEA_PROMPT, userMessage),
      60000,
      '콘텐츠 아이디어 생성 시간 초과'
    );

    let ideas = [];
    try {
      const jsonStr = aiResponse.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
      ideas = JSON.parse(jsonStr);
    } catch {
      ideas = [{ title: topic, message: aiResponse.slice(0, 200), platform_fit: {}, hook: '' }];
    }

    // Save project
    const { data, error } = await supabase
      .from('content_projects')
      .insert({
        topic,
        platforms: selectedPlatforms,
        status: 'idea_proposed',
        ideas,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('content_ideas_generated', 'marketing', { topic, ideaCount: ideas.length });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — update project (select idea, update notes, change status, generate drafts)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Action: generate drafts from selected idea
    if (action === 'generate_drafts') {
      // 1. Fetch project
      const { data: project, error: fetchErr } = await supabase
        .from('content_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr || !project) throw fetchErr ?? new Error('Project not found');

      const idea = project.ideas?.[project.selected_idea_index ?? 0];
      if (!idea) return NextResponse.json({ error: 'No idea selected' }, { status: 400 });

      // 2. Generate drafts
      const draftMsg = `주제: "${project.topic}"\n선택된 아이디어:\n- 제목: ${idea.title}\n- 핵심 메시지: ${idea.message}\n- 훅: ${idea.hook}\n대상 플랫폼: ${project.platforms.join(', ')}\n\n이 아이디어로 각 플랫폼별 콘텐츠를 작성해주세요.`;
      const draftResponse = await withTimeout(
        generateCompletion(CONTENT_DRAFT_PROMPT, draftMsg),
        60000,
        '콘텐츠 초안 생성 시간 초과'
      );

      let drafts: Record<string, unknown> = {};
      let explanation = '';
      let bannerCopy = idea.title;
      let bannerRef = '';
      try {
        const jsonStr = draftResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        const parsed = JSON.parse(jsonStr);
        drafts = parsed.drafts ?? {};
        explanation = parsed.explanation ?? '';
        if (parsed.banner_suggestion) {
          bannerCopy = parsed.banner_suggestion.copy || bannerCopy;
          bannerRef = parsed.banner_suggestion.reference || '';
        }
      } catch {
        drafts = { blog: { content: draftResponse } };
      }

      // 3. Generate banner
      const [width, height] = '1200x630'.split('x');
      const bannerMsg = `배너 사이즈: ${width}px x ${height}px\n카피: ${bannerCopy}\n${bannerRef ? `레퍼런스/참고사항: ${bannerRef}` : ''}\n\n위 정보를 바탕으로 배너 HTML을 생성해주세요.`;
      const bannerHtml = await withTimeout(
        generateCompletion(BANNER_GENERATION_PROMPT, bannerMsg),
        60000,
        '배너 생성 시간 초과'
      );
      const cleanHtml = bannerHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

      const { data: banner } = await supabase
        .from('banners')
        .insert({ copy: bannerCopy, reference: bannerRef, size: '1200x630', html: cleanHtml })
        .select()
        .single();

      // 4. Update project
      const { data, error } = await supabase
        .from('content_projects')
        .update({
          drafts,
          ai_explanation: explanation,
          banner_id: banner?.id ?? null,
          banner_html: cleanHtml,
          status: 'review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await logActivity('content_drafts_generated', 'marketing', { topic: project.topic });
      return NextResponse.json(data);
    }

    // Default: simple field update
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('content_projects')
      .update(updates)
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase.from('content_projects').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
