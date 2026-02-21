import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Today's usage
    const { data: todayData, error: todayError } = await supabase
      .from('token_usage')
      .select('tokens_in, tokens_out')
      .gte('created_at', todayStart);

    if (todayError) {
      return NextResponse.json({ error: todayError.message }, { status: 500 });
    }

    // This month's usage
    const { data: monthData, error: monthError } = await supabase
      .from('token_usage')
      .select('tokens_in, tokens_out')
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
