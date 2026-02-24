import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCompletion, generateCompletionWithImage } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
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
      // Extract base64 data and media type from data URL
      const match = referenceImage.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        const base64Data = match[2];
        html = await generateCompletionWithImage(BANNER_GENERATION_PROMPT, userMessage, base64Data, mediaType);
      } else {
        html = await generateCompletion(BANNER_GENERATION_PROMPT, userMessage);
      }
    } else {
      html = await generateCompletion(BANNER_GENERATION_PROMPT, userMessage);
    }

    // HTML 코드만 추출 (마크다운 코드블록 제거)
    const cleanHtml = html
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const { data, error } = await supabase
      .from('banners')
      .insert({ copy, reference, size, html: cleanHtml })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity('banner_generate', 'design', { size, copy: copy.slice(0, 50) });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
