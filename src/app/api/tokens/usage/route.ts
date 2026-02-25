import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Today's usage
    const { data: todayData, error: todayError } = await supabaseAdmin
      .from('token_usage')
      .select('tokens_in, tokens_out')
      .eq('user_id', userEmail)
      .gte('created_at', todayStart);

    if (todayError) {
      return NextResponse.json({ error: todayError.message }, { status: 500 });
    }

    // This month's usage
    const { data: monthData, error: monthError } = await supabaseAdmin
      .from('token_usage')
      .select('tokens_in, tokens_out')
      .eq('user_id', userEmail)
      .gte('created_at', monthStart);

    if (monthError) {
      return NextResponse.json({ error: monthError.message }, { status: 500 });
    }

    const sumTokens = (rows: { tokens_in: number; tokens_out: number }[]) => ({
      tokens_in: rows.reduce((sum, r) => sum + r.tokens_in, 0),
      tokens_out: rows.reduce((sum, r) => sum + r.tokens_out, 0),
      total: rows.reduce((sum, r) => sum + r.tokens_in + r.tokens_out, 0),
    });

    return NextResponse.json({
      today: sumTokens(todayData || []),
      month: sumTokens(monthData || []),
    });
  } catch (error) {
    console.error('Token usage fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch token usage' }, { status: 500 });
  }
}
