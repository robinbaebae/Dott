import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { FIGMA_DESIGN_PROMPT, FIGMA_DESIGN_EDIT_PROMPT } from '@/lib/prompts';
import { getBrandGuideContext } from '@/lib/brand-guide';
import { logActivity } from '@/lib/activity';

/**
 * POST - Generate a design HTML for Figma
 * Body: { prompt, size?, designId? (for edits), existingHtml? }
 */
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);

  const body = await req.json();
  const { prompt, size = '1080x1080', designId, existingHtml } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  try {
    // Get brand context for design
    let brandContext = '';
    try {
      brandContext = await getBrandGuideContext(userEmail);
    } catch { /* no brand guide */ }

    let html: string;

    if (designId && existingHtml) {
      // Edit existing design
      const editPrompt = `기존 HTML:\n${existingHtml}\n\n수정 요청: ${prompt}\n\n${brandContext ? `\n브랜드 컨텍스트:\n${brandContext}` : ''}`;
      html = await generateCompletion(apiKey, FIGMA_DESIGN_EDIT_PROMPT, editPrompt);
    } else {
      // New design
      const userPrompt = `디자인 요청: ${prompt}\n사이즈: ${size}${brandContext ? `\n\n브랜드 컨텍스트:\n${brandContext}` : ''}`;
      html = await generateCompletion(apiKey, FIGMA_DESIGN_PROMPT, userPrompt);
    }

    // Clean HTML
    html = html
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    // Save to DB
    const isEdit = !!designId;
    let savedId = designId;

    if (isEdit && designId) {
      await supabaseAdmin
        .from('figma_designs')
        .update({ html, updated_at: new Date().toISOString() })
        .eq('id', designId);
    } else {
      const { data } = await supabaseAdmin
        .from('figma_designs')
        .insert({
          user_id: userEmail,
          prompt,
          size,
          html,
          status: 'generated',
        })
        .select('id')
        .single();
      savedId = data?.id;
    }

    await logActivity('figma_design', 'design', {
      designId: savedId,
      isEdit,
      size,
    });

    return NextResponse.json({
      designId: savedId,
      html,
      size,
      status: 'generated',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

/**
 * GET - Serve design HTML for Figma capture (by id)
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('figma_designs')
    .select('html, size')
    .eq('id', id)
    .single();

  if (!data?.html) {
    return new NextResponse('Design not found', { status: 404 });
  }

  // Return as HTML page for Figma capture
  return new NextResponse(data.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * PATCH - Update design status (after Figma push)
 */
export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { designId, figmaUrl, figmaFileKey, status } = await req.json();
  if (!designId) {
    return NextResponse.json({ error: 'designId required' }, { status: 400 });
  }

  await supabaseAdmin
    .from('figma_designs')
    .update({
      figma_url: figmaUrl || null,
      figma_file_key: figmaFileKey || null,
      status: status || 'pushed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', designId);

  return NextResponse.json({ ok: true });
}
