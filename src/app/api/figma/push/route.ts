import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, generateCompletionWithImage, getUserApiKey } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { parseFileUrl, getFileInfo } from '@/lib/figma';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;
    const apiKey = await getUserApiKey(userEmail);
    if (!apiKey) return NextResponse.json({ error: 'API 키가 설정되지 않았습니다. 설정에서 등록해 주세요.' }, { status: 400 });

    const { copy, reference, size, referenceImage, figmaFileUrl } = await req.json();

    if (!copy || !size) {
      return NextResponse.json({ error: 'copy and size are required' }, { status: 400 });
    }

    const [width, height] = size.split('x');

    const userMessage = `배너 사이즈: ${width}px x ${height}px
카피: ${copy}
${reference ? `레퍼런스/참고사항: ${reference}` : ''}
${referenceImage ? '첨부된 이미지를 레퍼런스로 참고하여 디자인해주세요.' : ''}

위 정보를 바탕으로 배너 HTML을 생성해주세요.`;

    let html: string;
    if (referenceImage) {
      const match = referenceImage.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        const base64Data = match[2];
        html = await generateCompletionWithImage(apiKey, BANNER_GENERATION_PROMPT, userMessage, base64Data, mediaType);
      } else {
        html = await generateCompletion(apiKey, BANNER_GENERATION_PROMPT, userMessage);
      }
    } else {
      html = await generateCompletion(apiKey, BANNER_GENERATION_PROMPT, userMessage);
    }

    // HTML 코드만 추출 (마크다운 코드블록 제거)
    const cleanHtml = html
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    // Save banner to DB
    const { data: banner, error: bannerError } = await supabaseAdmin
      .from('banners')
      .insert({ copy, reference, size, html: cleanHtml, user_id: userEmail })
      .select()
      .single();

    if (bannerError) {
      return NextResponse.json({ error: bannerError.message }, { status: 500 });
    }

    // Parse Figma file info if URL provided
    let fileKey = '';
    let fileName = '';
    let nodeId: string | null = null;

    if (figmaFileUrl) {
      const parsed = parseFileUrl(figmaFileUrl);
      if (parsed) {
        fileKey = parsed.fileKey;
        nodeId = parsed.nodeId || null;
        try {
          const info = await getFileInfo(fileKey, userEmail);
          fileName = info.name;
        } catch {
          fileName = fileKey;
        }
      }
    }

    // Create figma push record
    const { error: pushError } = await supabaseAdmin
      .from('figma_extractions')
      .insert({
        file_key: fileKey || 'local',
        file_name: fileName || 'Local Banner',
        node_id: nodeId,
        banner_id: banner.id,
        status: 'pending',
        user_id: userEmail,
      });

    if (pushError) {
      console.error('Failed to create push record:', pushError.message);
    }

    return NextResponse.json({
      bannerId: banner.id,
      banner,
      fileKey,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: update push status
export async function PATCH(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { bannerId, figmaUrl, status } = await req.json();
    if (!bannerId) {
      return NextResponse.json({ error: 'bannerId is required' }, { status: 400 });
    }

    const update: Record<string, string> = {};
    if (figmaUrl) update.figma_url = figmaUrl;
    if (status) update.status = status;

    const { error } = await supabaseAdmin
      .from('figma_extractions')
      .update(update)
      .eq('banner_id', bannerId)
      .eq('user_id', userEmail);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: recent push history
export async function GET() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { data, error } = await supabaseAdmin
      .from('figma_extractions')
      .select('*, banners(id, copy, size, created_at)')
      .eq('user_id', userEmail)
      .order('extracted_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
