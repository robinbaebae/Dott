import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

export interface MarketingEvent {
  title: string;
  start: string;
  end: string;
  category: string;
  description: string;
}

// Simple in-memory cache (key: year-month, TTL: 1 hour)
const cache = new Map<string, { data: MarketingEvent[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

function parseEventsFromHtml(html: string): MarketingEvent[] {
  const startIdx = html.indexOf('events: [');
  if (startIdx === -1) return [];

  let bracketDepth = 0, arrayStart = -1, arrayEnd = -1;
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === '[') { if (!bracketDepth) arrayStart = i; bracketDepth++; }
    else if (html[i] === ']') { bracketDepth--; if (!bracketDepth) { arrayEnd = i; break; } }
  }
  if (arrayStart === -1 || arrayEnd === -1) return [];

  return parseEventsFromRaw(html.slice(arrayStart + 1, arrayEnd));
}

function parseEventsFromRaw(content: string): MarketingEvent[] {
  // Handle escaped quotes: \' → placeholder
  const PLACEHOLDER = '\x00';
  const safe = content.replace(/\\'/g, PLACEHOLDER);
  const KEYS = ['className', 'title', 'start', 'end', 'url', 'description', 'category'];
  const events: MarketingEvent[] = [];
  const chunks = safe.split(/\{/).filter((s) => s.trim());

  for (const chunk of chunks) {
    const vals: Record<string, string> = {};
    let remaining = chunk;

    for (let i = 0; i < KEYS.length; i++) {
      const key = KEYS[i];
      const keyPos = remaining.indexOf(key);
      if (keyPos === -1) break;
      const colonIdx = remaining.indexOf(':', keyPos);
      const quoteStart = remaining.indexOf("'", colonIdx);
      if (quoteStart === -1) break;

      let quoteEnd: number;
      if (i < KEYS.length - 1) {
        const nextKey = KEYS[i + 1];
        const searchPattern = new RegExp(`'\\s*,\\s*${nextKey}`);
        const tail = remaining.slice(quoteStart + 1);
        const searchMatch = searchPattern.exec(tail);
        if (!searchMatch) break;
        quoteEnd = quoteStart + 1 + searchMatch.index;
      } else {
        quoteEnd = remaining.lastIndexOf("'");
        if (quoteEnd <= quoteStart) break;
      }

      vals[key] = remaining.slice(quoteStart + 1, quoteEnd).replace(/\x00/g, "'");
      remaining = remaining.slice(quoteEnd + 1);
    }

    if (vals.start) {
      events.push({
        title: vals.title || '',
        start: (vals.start || '').split(' ')[0],
        end: (vals.end || '').split(' ')[0],
        category: vals.category || '',
        description: vals.description || '',
      });
    }
  }
  return events;
}

async function fetchIBossEvents(year: number, month: number): Promise<MarketingEvent[]> {
  const cacheKey = `${year}-${String(month).padStart(2, '0')}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Fetch the HTML page directly — the AJAX endpoint no longer returns JSON
    const res = await fetch('https://www.i-boss.co.kr/ab-marketing_calendar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!res.ok) return [];

    const html = await res.text();
    const events = parseEventsFromHtml(html);

    // The initial page always loads the current month's events.
    // Cache them with the actual month from the event data.
    if (events.length > 0) {
      // Determine what month the page returned
      const firstDate = events[0].start;
      const pageMonthKey = firstDate.slice(0, 7); // e.g. "2026-02"
      cache.set(pageMonthKey, { data: events, ts: Date.now() });

      // If the requested month matches, return directly
      if (pageMonthKey === cacheKey) {
        return events;
      }
    }

    // For other months, filter events that fall within the requested month
    const monthPrefix = cacheKey; // e.g. "2026-03"
    const monthEvents = events.filter((ev) => ev.start.startsWith(monthPrefix) || ev.end.startsWith(monthPrefix));
    if (monthEvents.length > 0) {
      cache.set(cacheKey, { data: monthEvents, ts: Date.now() });
      return monthEvents;
    }

    // If the requested month isn't the current month and has no events from the page, return empty
    return [];
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
