import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

// GET — list calendar items, optional date range filter
export async function GET(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    let query = supabaseAdmin
      .from('content_calendar')
      .select('*')
      .eq('user_id', userEmail)
      .order('scheduled_date', { ascending: true });

    if (startDate) query = query.gte('scheduled_date', startDate);
    if (endDate) query = query.lte('scheduled_date', endDate);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[content-calendar GET]', err);
    return NextResponse.json({ error: '캘린더를 불러올 수 없습니다' }, { status: 500 });
  }
}

// POST — create a calendar item
export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const body = await req.json();
    const { title, platform, scheduled_date, scheduled_time, content, notes } = body;

    if (!title || !scheduled_date) {
      return NextResponse.json({ error: 'title and scheduled_date required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('content_calendar')
      .insert({
        title,
        platform: platform || 'instagram',
        scheduled_date,
        scheduled_time: scheduled_time || null,
        content: content || '',
        notes: notes || '',
        status: 'draft',
        user_id: userEmail,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[content-calendar POST]', err);
    return NextResponse.json({ error: '캘린더 항목을 생성할 수 없습니다' }, { status: 500 });
  }
}

// PATCH — update a calendar item
export async function PATCH(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const ALLOWED_FIELDS = ['title', 'platform', 'scheduled_date', 'scheduled_time', 'content', 'notes', 'status'];

    const body = await req.json();
    const { id } = body;
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('content_calendar')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[content-calendar PATCH]', err);
    return NextResponse.json({ error: '캘린더 항목을 수정할 수 없습니다' }, { status: 500 });
  }
}

// DELETE — remove a calendar item
export async function DELETE(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('content_calendar').delete().eq('id', id).eq('user_id', userEmail);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[content-calendar DELETE]', err);
    return NextResponse.json({ error: '캘린더 항목을 삭제할 수 없습니다' }, { status: 500 });
  }
}
