import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { generateCompletion, generateCompletionWithImage, getUserApiKey } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';

// GET - Fetch banner by id
export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('banners')
    .select('*')
    .eq('id', id)
    .eq('user_id', userEmail)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// POST - Generate a new banner (used by NewBannerForm)
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);
  if (!apiKey) {
    return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 400 });
  }

  try {
    const { copy, reference, size, referenceImage } = await req.json();

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

    const cleanHtml = html
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const { data: banner, error: bannerError } = await supabaseAdmin
      .from('banners')
      .insert({ copy, reference, size, html: cleanHtml, user_id: userEmail })
      .select()
      .single();

    if (bannerError) {
      return NextResponse.json({ error: bannerError.message }, { status: 500 });
    }

    await logActivity('banner_created', 'design', { size, bannerId: banner.id }, userEmail);

    return NextResponse.json(banner);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
