import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

interface IBossEvent {
  className: string;
  title: string;
  start: string;
  end: string;
  url: string;
  description: string;
  category: string;
}

export interface MarketingEvent {
  title: string;
  start: string;
  end: string;
  category: string;
  description: string;
}

// Simple in-memory cache (key: year-month, TTL: 1 hour)
const cache = new Map<string, { data: MarketingEvent[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function parseEventsFromHtml(html: string): IBossEvent[] {
  // Extract the events array from FullCalendar initialization
  // Pattern: events: [ ... ] within the script
  const match = html.match(/events\s*:\s*\[(\s*\{[\s\S]*?\})\s*\]/);
  if (!match) return [];

  const rawArray = match[0]; // events: [...]
  // Extract just the array part
  const arrayStr = rawArray.replace(/^events\s*:\s*/, '');

  // Convert JS object notation to valid JSON:
  // 1. Replace single quotes with double quotes
  // 2. Add quotes around unquoted keys
  let jsonStr = arrayStr
    // Quote unquoted keys: className: -> "className":
    .replace(/(\w+)\s*:/g, '"$1":')
    // Replace single-quoted values with double quotes
    .replace(/'([^']*)'/g, '"$1"');

  // Fix potential double-quoting of already quoted keys
  jsonStr = jsonStr.replace(/""/g, '"');

  try {
    const events = JSON.parse(jsonStr) as IBossEvent[];
    return events;
  } catch {
    // Fallback: extract events one by one using regex
    const events: IBossEvent[] = [];
    const eventRegex = /\{\s*"className"\s*:\s*"([^"]*)"\s*,\s*"title"\s*:\s*"([^"]*)"\s*,\s*"start"\s*:\s*"([^"]*)"\s*,\s*"end"\s*:\s*"([^"]*)"\s*,\s*"url"\s*:\s*"([^"]*)"\s*,\s*"description"\s*:\s*"([^"]*)"\s*,\s*"category"\s*:\s*"([^"]*)"\s*\}/g;
    let m;
    while ((m = eventRegex.exec(jsonStr)) !== null) {
      events.push({
        className: m[1],
        title: m[2],
        start: m[3],
        end: m[4],
        url: m[5],
        description: m[6],
        category: m[7],
      });
    }
    return events;
  }
}

async function fetchIBossEvents(year: number, month: number): Promise<MarketingEvent[]> {
  const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Fetch the i-boss marketing calendar page
    const res = await fetch('https://www.i-boss.co.kr/ab-marketing_calendar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const rawEvents = parseEventsFromHtml(html);

    // Filter to requested month and convert
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const events: MarketingEvent[] = rawEvents
      .filter((e) => e.start.startsWith(prefix))
      .map((e) => ({
        title: e.title,
        start: e.start.split(' ')[0],
        end: e.end.split(' ')[0],
        category: e.category,
        description: e.description,
      }));

    cache.set(cacheKey, { data: events, ts: Date.now() });
    return events;
  } catch (err) {
    console.error('[marketing-calendar] fetch error:', err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { searchParams } = new URL(req.url);
  const yearStr = searchParams.get('year');
  const monthStr = searchParams.get('month');

  const now = new Date();
  const year = yearStr ? parseInt(yearStr) : now.getFullYear();
  const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;

  const events = await fetchIBossEvents(year, month);

  return NextResponse.json(events, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
