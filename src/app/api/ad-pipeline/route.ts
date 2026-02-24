import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

// GET — list ad pipeline projects
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ad_creative_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create new pipeline project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, template_config } = body;

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const { data, error } = await supabase
      .from('ad_creative_projects')
      .insert({ name, template_config: template_config || {}, status: 'stage_1' })
      .select()
      .single();

    if (error) throw error;
    await logActivity('ad_pipeline_created', 'marketing', { name });
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

    const { error } = await supabase.from('ad_creative_projects').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
