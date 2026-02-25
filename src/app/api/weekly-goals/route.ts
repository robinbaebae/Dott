import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const userId = userEmail;

  const { data } = await supabaseAdmin
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .order('platform');

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const userId = userEmail;
  const body = await req.json();

  const { platform, target_count } = body;
  if (!platform || typeof target_count !== 'number') {
    return NextResponse.json({ error: 'platform and target_count required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('weekly_goals')
    .upsert(
      { platform, target_count, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: 'platform,user_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
