import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { AUTOMATION_PROMPTS } from '@/lib/prompts';
import { requireAuth } from '@/lib/auth-guard';

// GET - 전체 자동화 조회
export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { data, error } = await supabaseAdmin
    .from('automations')
    .select('*')
    .eq('user_id', userEmail)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - 자동화 생성
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);


  const body = await req.json();

  // 실행 요청인 경우
  if (body.action === 'execute') {
    const { data: automation } = await supabaseAdmin
      .from('automations')
      .select('*')
      .eq('id', body.id)
      .eq('user_id', userEmail)
      .single();

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    const systemPrompt = AUTOMATION_PROMPTS[automation.type] || '';
    const userPrompt = body.input
      ? `${automation.prompt_template}\n\n입력: ${body.input}`
      : automation.prompt_template;

    try {
      const result = await generateCompletion(apiKey, systemPrompt, userPrompt);

      await supabaseAdmin
        .from('automations')
        .update({
          last_result: result,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .eq('user_id', userEmail);

      return NextResponse.json({ result });
    } catch (error) {
      console.error('Automation execution error:', error);
      return NextResponse.json({ error: '자동화 실행 중 오류가 발생했습니다.' }, { status: 500 });
    }
  }

  // 생성 요청
  const { data, error } = await supabaseAdmin
    .from('automations')
    .insert({
      name: body.name,
      type: body.type,
      prompt_template: body.prompt_template,
      user_id: userEmail,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE - 자동화 삭제
export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('automations').delete().eq('id', id).eq('user_id', userEmail);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
