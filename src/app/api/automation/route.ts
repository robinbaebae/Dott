import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { AUTOMATION_PROMPTS } from '@/lib/prompts';

// GET - 전체 자동화 조회
export async function GET() {
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - 자동화 생성
export async function POST(req: NextRequest) {
  const body = await req.json();

  // 실행 요청인 경우
  if (body.action === 'execute') {
    const { data: automation } = await supabase
      .from('automations')
      .select('*')
      .eq('id', body.id)
      .single();

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    const systemPrompt = AUTOMATION_PROMPTS[automation.type] || '';
    const userPrompt = body.input
      ? `${automation.prompt_template}\n\n입력: ${body.input}`
      : automation.prompt_template;

    try {
      const result = await generateCompletion(systemPrompt, userPrompt);

      await supabase
        .from('automations')
        .update({
          last_result: result,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', body.id);

      return NextResponse.json({ result });
    } catch (error) {
      console.error('Automation execution error:', error);
      return NextResponse.json({ error: '자동화 실행 중 오류가 발생했습니다.' }, { status: 500 });
    }
  }

  // 생성 요청
  const { data, error } = await supabase
    .from('automations')
    .insert({
      name: body.name,
      type: body.type,
      prompt_template: body.prompt_template,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE - 자동화 삭제
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('automations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
