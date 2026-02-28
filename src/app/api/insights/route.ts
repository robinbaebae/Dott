import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { sanitizeFilterValue } from '@/lib/postgrest-sanitize';

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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DottBot/1.0)' },
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
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get('content_type');

  const q = searchParams.get('q');

  let query = supabaseAdmin.from('insights').select('*').eq('user_id', userEmail).order('created_at', { ascending: false });
  if (contentType && contentType !== 'all') {
    query = query.eq('content_type', contentType);
  }
  if (q) {
    query = query.or(`title.ilike.%${sanitizeFilterValue(q)}%,description.ilike.%${sanitizeFilterValue(q)}%,memo.ilike.%${sanitizeFilterValue(q)}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — save a URL as an insight
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { url, content_type, swipe_category } = body;
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  const contentType = content_type === 'swipe' ? 'swipe' : classifyUrl(url);
  const sourceDomain = extractDomain(url);
  const { title, description, thumbnailUrl } = await fetchMetadata(url);

  const insertData: Record<string, unknown> = {
    url,
    title: title || sourceDomain || url,
    description,
    memo: '',
    content_type: contentType,
    thumbnail_url: thumbnailUrl,
    source_domain: sourceDomain,
    user_id: userEmail,
  };

  if (contentType === 'swipe' && swipe_category) {
    insertData.swipe_category = swipe_category;
  }

  const { data, error } = await supabaseAdmin
    .from('insights')
    .upsert(insertData, { onConflict: 'url,user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH — update memo and/or tags
export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { id, memo, tags } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (memo !== undefined) updates.memo = memo;
  if (tags !== undefined) updates.tags = tags;

  const { data, error } = await supabaseAdmin
    .from('insights')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userEmail)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove an insight by id
export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('insights').delete().eq('id', id).eq('user_id', userEmail);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
