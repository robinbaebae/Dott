import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { data, error } = await supabaseAdmin
    .from('activity_logs')
    .select('id, action_type, agent_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[notifications/GET] DB error:', error);
    return NextResponse.json({ notifications: [] });
  }

  return NextResponse.json({ notifications: data || [] });
}
