import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function classifyUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('x.com') || lower.includes('twitter.com')) return 'tweet';
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) return 'video';
  if (lower.endsWith('.pdf')) return 'pdf';
  return 'article';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

async function fetchMetadata(url: string) {
  let title = '';
  let description = '';
  let thumbnailUrl = '';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DittoBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?? '';
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? '';
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? '';

    title = ogTitle;
    description = ogDesc;
    thumbnailUrl = ogImage;
  } catch {
    // metadata fetch is best-effort
  }

  return { title, description, thumbnailUrl };
}

// GET — list insights with optional content_type filter
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get('content_type');

  let query = supabase.from('insights').select('*').order('created_at', { ascending: false });
  if (contentType && contentType !== 'all') {
    query = query.eq('content_type', contentType);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — save a URL as an insight
export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  const contentType = classifyUrl(url);
  const sourceDomain = extractDomain(url);
  const { title, description, thumbnailUrl } = await fetchMetadata(url);

  const { data, error } = await supabase
    .from('insights')
    .upsert(
      {
        url,
        title: title || sourceDomain || url,
        description,
        content_type: contentType,
        thumbnail_url: thumbnailUrl,
        source_domain: sourceDomain,
      },
      { onConflict: 'url' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE — remove an insight by id
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('insights').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
