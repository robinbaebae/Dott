import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

export interface MarketingEvent {
  title: string;
  start: string;
  end: string;
  category: string;
  description: string;
}

interface IBossAjaxEvent {
  className: string;
  title: string;
  start: string;
  end: string;
  url: string;
  description: string;
  category: string;
}

// Simple in-memory cache (key: year-month, TTL: 1 hour)
const cache = new Map<string, { data: MarketingEvent[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

// Session cookie cache (reuse across requests)
let sessionCookie: { value: string; ts: number } | null = null;
const SESSION_TTL = 30 * 60 * 1000; // 30 min

async function getSessionCookie(): Promise<string> {
  if (sessionCookie && Date.now() - sessionCookie.ts < SESSION_TTL) {
    return sessionCookie.value;
  }

  const res = await fetch('https://www.i-boss.co.kr/ab-marketing_calendar', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  });

  const setCookies = res.headers.getSetCookie?.() || [];
  const phpSession = setCookies
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('PHPSESSID='));

  const cookie = phpSession || '';
  sessionCookie = { value: cookie, ts: Date.now() };

  // Also parse current month events from the initial HTML for caching
  const html = await res.text();
  cacheCurrentMonthFromHtml(html);

  return cookie;
}

function cacheCurrentMonthFromHtml(html: string) {
  // Parse events from initial page load (current month only)
  const startIdx = html.indexOf('events: [');
  if (startIdx === -1) return;

  let bracketDepth = 0, arrayStart = -1, arrayEnd = -1;
  for (let i = startIdx; i < html.length; i++) {
    if (html[i] === '[') { if (!bracketDepth) arrayStart = i; bracketDepth++; }
    else if (html[i] === ']') { bracketDepth--; if (!bracketDepth) { arrayEnd = i; break; } }
  }
  if (arrayStart === -1 || arrayEnd === -1) return;

  const events = parseEventsFromRaw(html.slice(arrayStart + 1, arrayEnd));
  if (events.length === 0) return;

  // Determine month from first event
  const firstDate = events[0].start;
  const monthKey = firstDate.slice(0, 7); // e.g. "2026-02"
  if (!cache.has(monthKey)) {
    cache.set(monthKey, { data: events, ts: Date.now() });
  }
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
    // Step 1: Get session cookie (may also cache current month)
    const cookie = await getSessionCookie();

    // Check if cacheCurrentMonthFromHtml already populated this month
    const freshCached = cache.get(cacheKey);
    if (freshCached && Date.now() - freshCached.ts < CACHE_TTL) {
      return freshCached.data;
    }

    // Step 2: Call AJAX endpoint for the specific month
    const monthStr = `${year}년 ${month}월`;
    const body = `month=${encodeURIComponent(monthStr)}&filter%5B%5D=all&type=calendar`;

    const res = await fetch(
      'https://www.i-boss.co.kr/template/PLUGIN_utility/program/calendar_keyword.ajax.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://www.i-boss.co.kr/ab-marketing_calendar',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookie,
        },
        body,
      }
    );

    if (!res.ok) return [];

    const json = await res.json();
    if (json.code !== 1 || !json.makeEvents) {
      // Retry with fresh session
      sessionCookie = null;
      const freshCookie = await getSessionCookie();
      const retryRes = await fetch(
        'https://www.i-boss.co.kr/template/PLUGIN_utility/program/calendar_keyword.ajax.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://www.i-boss.co.kr/ab-marketing_calendar',
            'X-Requested-With': 'XMLHttpRequest',
            'Cookie': freshCookie,
          },
          body,
        }
      );
      const retryJson = await retryRes.json();
      if (retryJson.code !== 1 || !retryJson.makeEvents) return [];
      return processAjaxEvents(retryJson.makeEvents, cacheKey);
    }

    return processAjaxEvents(json.makeEvents, cacheKey);
  } catch (err) {
    console.error('[marketing-calendar] fetch error:', err);
    return [];
  }
}

function processAjaxEvents(makeEvents: IBossAjaxEvent[], cacheKey: string): MarketingEvent[] {
  const events: MarketingEvent[] = makeEvents.map((e) => ({
    title: e.title || '',
    start: (e.start || '').split(' ')[0],
    end: (e.end || '').split(' ')[0],
    category: e.category || '',
    description: e.description || '',
  }));

  cache.set(cacheKey, { data: events, ts: Date.now() });
  return events;
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
