import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ website: null, instagram: null });
  }

  try {
    const [website, instagram] = await Promise.all([
      findWebsite(name),
      findInstagram(name),
    ]);
    return NextResponse.json({ website, instagram });
  } catch (error) {
    console.error('GET /api/competitors/search error:', error);
    return NextResponse.json({ website: null, instagram: null });
  }
}

async function braveSearch(query: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    return res.ok ? await res.text() : '';
  } catch {
    clearTimeout(timeout);
    return '';
  }
}

const SKIP_DOMAINS = /google\.|youtube\.|facebook\.|instagram\.|twitter\.|x\.com|naver\.com|daum\.|tistory\.|blog\.naver|news\.|wikipedia\.|namu\.wiki|duckduckgo\.|linkedin\.|pinterest\.|tiktok\.|brave\.com|search\.brave|imgs\.search|tiles\.search|cdn\.search|appsweb\.kr/i;

async function findWebsite(name: string): Promise<string | null> {
  const html = await braveSearch(`${name} 공식 홈페이지`);
  if (!html) return null;

  // Extract all https URLs from href attributes
  const hrefPattern = /href="(https:\/\/[^"]+)"/g;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    try {
      const parsed = new URL(match[1]);
      if (SKIP_DOMAINS.test(parsed.hostname)) continue;
      // Skip URLs with too many path segments (likely article pages)
      if (parsed.pathname.split('/').filter(Boolean).length > 2) continue;
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      continue;
    }
  }
  return null;
}

async function findInstagram(name: string): Promise<string | null> {
  const html = await braveSearch(`${name} instagram`);
  if (!html) return null;

  const igPattern = /instagram\.com\/([a-zA-Z0-9_.]{2,30})/g;
  const skip = new Set(['p', 'explore', 'reel', 'reels', 'stories', 'accounts', 'direct', 'about', 'developer', 'en', 'ko']);
  let match;
  while ((match = igPattern.exec(html)) !== null) {
    const handle = match[1];
    if (!skip.has(handle)) {
      return `@${handle}`;
    }
  }
  return null;
}
