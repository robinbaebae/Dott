import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractKeywords } from '@/lib/keywords';
import { TrendArticle } from '@/types';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { data, error } = await supabaseAdmin
      .from('trend_articles')
      .select('*')
      .order('pub_date', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const keywords = extractKeywords((data ?? []) as TrendArticle[]);
    return NextResponse.json(keywords);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
