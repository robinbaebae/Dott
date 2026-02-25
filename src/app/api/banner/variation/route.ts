import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletionWithImage } from '@/lib/claude';
import { BANNER_VARIATION_PROMPT } from '@/lib/prompts';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { image, targetSize } = await req.json();

    if (!image || !targetSize) {
      return NextResponse.json({ error: 'image and targetSize are required' }, { status: 400 });
    }

    const [width, height] = targetSize.split('x');

    const userMessage = `이 배너를 ${width}px x ${height}px 사이즈로 변환해주세요.
원본 배너의 핵심 요소(카피, 색상, 브랜드 요소)를 유지하면서 새 사이즈에 맞게 레이아웃을 최적화해주세요.`;

    // Extract base64 data
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64Data = match[2];

    const html = await generateCompletionWithImage(
      BANNER_VARIATION_PROMPT,
      userMessage,
      base64Data,
      mediaType,
    );

    const cleanHtml = html
      .replace(/^```html?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    const { data, error } = await supabaseAdmin
      .from('banners')
      .insert({ copy: `Size variation: ${targetSize}`, size: targetSize, html: cleanHtml, user_id: userEmail })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
