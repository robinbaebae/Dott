import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// POST — Stage 1: Bulk creative generation from template
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;
    const apiKey = await getUserApiKey(userEmail);


    const { id } = await params;
    const body = await req.json();
    const { copies, sizes, reference } = body;

    if (!copies?.length || !sizes?.length) {
      return NextResponse.json({ error: 'copies and sizes required' }, { status: 400 });
    }

    const creatives: Array<{ banner_id: string; size: string; copy: string }> = [];

    for (const copy of copies) {
      for (const size of sizes) {
        try {
          const html = await withTimeout(
            generateCompletion(
              apiKey,
              BANNER_GENERATION_PROMPT,
              `카피: "${copy}"\n사이즈: ${size}\n참고: ${reference || '코드앤버터 브랜드, #5B4D6E 퍼플 계열'}`
            ),
            60000,
            `배너 생성 시간 초과 (${size})`
          );

          const cleanHtml = html.replace(/^```html\n?/m, '').replace(/\n?```$/m, '').trim();

          const { data: banner } = await supabaseAdmin
            .from('banners')
            .insert({ copy: copy.slice(0, 100), reference: reference || '', size, html: cleanHtml, user_id: userEmail })
            .select()
            .single();

          if (banner) {
            creatives.push({ banner_id: banner.id, size, copy });
          }
        } catch (err) {
          console.error(`Failed to generate ${size} for "${copy}":`, err);
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .update({ creatives, status: 'stage_2', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) throw error;
    await logActivity('ad_creatives_generated', 'design', { count: creatives.length });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
