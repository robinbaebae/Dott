import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const userId = userEmail;

  const { data } = await supabaseAdmin
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    // Return defaults (all enabled)
    return NextResponse.json({
      user_id: userId,
      tasks_enabled: true,
      briefing_enabled: true,
      token_enabled: true,
      trends_enabled: true,
      content_calendar_enabled: true,
      sns_performance_enabled: true,
      weekly_goals_enabled: true,
      work_time_enabled: true,
      meeting_dnd_enabled: true,
    });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const userId = userEmail;
  const body = await req.json();

  // Only allow known boolean fields
  const allowedFields = [
    'tasks_enabled', 'briefing_enabled', 'token_enabled', 'trends_enabled',
    'content_calendar_enabled', 'sns_performance_enabled', 'weekly_goals_enabled',
    'work_time_enabled', 'meeting_dnd_enabled',
  ];

  const updates: Record<string, boolean> = {};
  for (const key of allowedFields) {
    if (typeof body[key] === 'boolean') {
      updates[key] = body[key];
    }
  }

  const { data, error } = await supabaseAdmin
    .from('notification_settings')
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
