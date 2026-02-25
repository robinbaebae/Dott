import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

// GET — list ad pipeline projects
export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .select('*')
      .eq('user_id', userEmail)
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
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const body = await req.json();
    const { name, template_config } = body;

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .insert({ name, template_config: template_config || {}, status: 'stage_1', user_id: userEmail })
      .select()
      .single();

    if (error) throw error;
    await logActivity('ad_pipeline_created', 'marketing', { name }, userEmail);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('ad_creative_projects').delete().eq('id', id).eq('user_id', userEmail);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
