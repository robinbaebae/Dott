import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { CONTENT_MATERIAL_PROMPT, CONTENT_DRAFT_PROMPT, BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// GET — list content projects
export async function GET(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabaseAdmin
      .from('content_projects')
      .select('*')
      .eq('user_id', userEmail)
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
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const body = await req.json();
    const { topic, platforms, tone } = body;

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const selectedPlatforms = platforms?.length ? platforms : ['instagram', 'threads', 'blog'];

    // Generate content materials via AI
    const toneLabel = tone || 'professional';
    const userMessage = `주제: "${topic}"\n대상 플랫폼: ${selectedPlatforms.join(', ')}\n톤: ${toneLabel}\n\n이 주제에 대한 콘텐츠 소재를 추천해주세요.`;
    const aiResponse = await withTimeout(
      generateCompletion(CONTENT_MATERIAL_PROMPT, userMessage),
      60000,
      '콘텐츠 소재 추천 시간 초과'
    );

    let materials = [];
    try {
      const jsonStr = aiResponse.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
      materials = JSON.parse(jsonStr);
    } catch {
      materials = [{ title: topic, approach: aiResponse.slice(0, 300), key_points: [], platform_fit: {}, engagement_reason: '', header_images: [] }];
    }

    // Map materials → ideas for backward compatibility
    const ideas = materials.map((m: { title: string; approach: string; platform_fit: Record<string, number>; engagement_reason: string }) => ({
      title: m.title,
      message: m.approach,
      platform_fit: m.platform_fit,
      hook: m.engagement_reason,
    }));

    // Save project
    const { data, error } = await supabaseAdmin
      .from('content_projects')
      .insert({
        topic,
        platforms: selectedPlatforms,
        status: 'idea_proposed',
        ideas,
        materials,
        user_id: userEmail,
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity('content_materials_generated', 'marketing', { topic, materialCount: materials.length });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[content-project POST]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — update project (select idea, update notes, change status, generate drafts)
export async function PATCH(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Action: generate drafts from selected idea
    if (action === 'generate_drafts') {
      // 1. Fetch project
      const { data: project, error: fetchErr } = await supabaseAdmin
        .from('content_projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', userEmail)
        .single();
      if (fetchErr || !project) throw fetchErr ?? new Error('Project not found');

      const selectedIdx = project.selected_idea_index ?? 0;
      const material = project.materials?.[selectedIdx];
      const idea = project.ideas?.[selectedIdx];
      if (!material && !idea) return NextResponse.json({ error: 'No material selected' }, { status: 400 });

      // Build draft prompt with rich material info
      const imageIdx = project.selected_image_index ?? 0;
      const imageConcept = material?.header_images?.[imageIdx];

      let draftMsg = `주제: "${project.topic}"\n`;
      if (material) {
        draftMsg += `선택된 소재:\n- 제목: ${material.title}\n- 접근 방식: ${material.approach}\n- 핵심 포인트: ${material.key_points.join(', ')}\n- 예상 반응: ${material.engagement_reason}\n`;
      } else if (idea) {
        draftMsg += `선택된 아이디어:\n- 제목: ${idea.title}\n- 핵심 메시지: ${idea.message}\n- 훅: ${idea.hook}\n`;
      }
      draftMsg += `대상 플랫폼: ${project.platforms.join(', ')}\n\n이 소재로 각 플랫폼별 콘텐츠를 작성해주세요.`;
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

      // 3. Generate banner (size based on platform) with image concept
      const bannerSize = project.platforms.includes('newsletter') ? '600x200' : '1200x630';
      const [width, height] = bannerSize.split('x');
      let bannerMsg = `배너 사이즈: ${width}px x ${height}px\n카피: ${bannerCopy}\n`;
      if (bannerRef) bannerMsg += `레퍼런스/참고사항: ${bannerRef}\n`;
      if (imageConcept) {
        bannerMsg += `\n이미지 컨셉:\n- 컨셉: ${imageConcept.label}\n- 설명: ${imageConcept.description}\n- 스타일: ${imageConcept.style_keywords.join(', ')}\n- 분위기: ${imageConcept.mood}\n`;
      }
      bannerMsg += `\n위 정보를 바탕으로 배너 HTML을 생성해주세요.`;
      const bannerHtml = await withTimeout(
        generateCompletion(BANNER_GENERATION_PROMPT, bannerMsg),
        60000,
        '배너 생성 시간 초과'
      );
      const cleanHtml = bannerHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

      const { data: banner } = await supabaseAdmin
        .from('banners')
        .insert({ copy: bannerCopy, reference: bannerRef, size: bannerSize, html: cleanHtml, user_id: userEmail })
        .select()
        .single();

      // 4. Update project
      const { data, error } = await supabaseAdmin
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
        .eq('user_id', userEmail)
        .select()
        .single();

      if (error) throw error;
      await logActivity('content_drafts_generated', 'marketing', { topic: project.topic });
      return NextResponse.json(data);
    }

    // Default: simple field update
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('content_projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userEmail)
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
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('content_projects').delete().eq('id', id).eq('user_id', userEmail);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
