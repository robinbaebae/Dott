import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

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

    title = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?? '';
    description = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? '';
    thumbnailUrl = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? '';
  } catch {
    // best-effort
  }

  return { title, description, thumbnailUrl };
}

// Chrome timestamp: microseconds since 1601-01-01
function chromeTimeToISO(chromeTime: string): string {
  const microseconds = parseInt(chromeTime, 10);
  if (!microseconds || isNaN(microseconds)) return new Date().toISOString();
  // Chrome epoch starts 1601-01-01, JS epoch 1970-01-01
  // Diff = 11644473600 seconds
  const ms = microseconds / 1000 - 11644473600000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

interface BookmarkInput {
  url: string;
  name: string;
  date_added?: string;
  folder_path?: string;
}

// POST — batch import bookmarks into insights
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const bookmarks: BookmarkInput[] = body.bookmarks;

  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return NextResponse.json({ error: 'bookmarks array required' }, { status: 400 });
  }

  if (bookmarks.length > 500) {
    return NextResponse.json({ error: 'max 500 bookmarks per import' }, { status: 400 });
  }

  // Fetch metadata with concurrency limit of 5
  const CONCURRENCY = 5;
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < bookmarks.length; i += CONCURRENCY) {
    const batch = bookmarks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (bm) => {
        const { title, description, thumbnailUrl } = await fetchMetadata(bm.url);
        const sourceDomain = extractDomain(bm.url);
        const tags: string[] = [];
        if (bm.folder_path) {
          tags.push(...bm.folder_path.split('/').filter(Boolean));
        }

        return {
          url: bm.url,
          title: title || bm.name || sourceDomain || bm.url,
          description,
          memo: '',
          content_type: 'article' as const,
          thumbnail_url: thumbnailUrl,
          source_domain: sourceDomain,
          tags: tags.length > 0 ? tags : null,
          user_id: userEmail,
          created_at: bm.date_added ? chromeTimeToISO(bm.date_added) : undefined,
        };
      })
    );
    rows.push(...results);
  }

  const { data, error } = await supabaseAdmin
    .from('insights')
    .upsert(rows, { onConflict: 'url,user_id', ignoreDuplicates: true })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imported: data?.length ?? 0, total: bookmarks.length }, { status: 201 });
}
