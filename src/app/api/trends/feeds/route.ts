import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

interface CustomFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
  created_at: string;
}

// GET — list custom RSS feeds
export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { data, error } = await supabaseAdmin
    .from('custom_rss_feeds')
    .select('*')
    .eq('user_id', userEmail)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — add a custom RSS feed
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { name, url, category } = body;
  if (!name || !url) {
    return NextResponse.json({ error: 'name and url required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('custom_rss_feeds')
    .insert({
      name: name.trim(),
      url: url.trim(),
      category: category || 'marketing',
      user_id: userEmail,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 피드입니다' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

// DELETE — remove a custom RSS feed
export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('custom_rss_feeds')
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
