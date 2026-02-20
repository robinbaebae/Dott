import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractKeywords } from '@/lib/keywords';
import { TrendArticle } from '@/types';

export async function GET() {
  try {
    const { data, error } = await supabase
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
