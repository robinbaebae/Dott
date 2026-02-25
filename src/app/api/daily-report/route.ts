import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateDailyReport } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { data } = await supabaseAdmin
      .from('daily_reports')
      .select('*')
      .eq('report_date', date)
      .eq('user_id', userEmail)
      .single();

    if (data) {
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'No report found for this date' }, { status: 404 });
  } catch (error) {
    console.error('Daily report GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const body = await req.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().split('T')[0];

    const result = await generateDailyReport(date, userEmail);

    return NextResponse.json({
      report_date: date,
      report_text: result.reportText,
      stats: result.stats,
    });
  } catch (error) {
    console.error('Daily report POST error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
