// ═══════════════════════════════════════════════════════════════
// Demo Fetch Interceptor — window.fetch monkey-patch
// 데모 모드일 때 /api/* 요청을 mock 데이터로 가로챔
// ═══════════════════════════════════════════════════════════════

import {
  DEMO_TASKS,
  DEMO_DAILY_REPORT,
  DEMO_NOTIFICATIONS,
  DEMO_CONTENT_CALENDAR,
  DEMO_KEYWORD_TRENDS,
  DEMO_CALENDAR_EVENTS,
  DEMO_ARTICLES,
  DEMO_TREND_SUMMARY,
  DEMO_COMPETITORS,
  DEMO_INSIGHTS,
  DEMO_MEMOS,
  DEMO_EXPENSES,
  DEMO_PROMOTIONS,
  DEMO_INFLUENCERS,
  DEMO_BRAND_GUIDE,
  DEMO_KNOWBAR_RESPONSES,
  DEMO_NOTIFICATION_SETTINGS,
  DEMO_TREND_FEEDS,
  DEMO_AD_CSV,
  DEMO_AD_ANALYTICS,
} from './demo-data';

let _installed = false;

/** 100~300ms 랜덤 딜레이 (자연스러운 로딩) */
function randomDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
}

/** mock JSON Response 생성 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Knowbar 키워드 매칭 */
function matchKnowbarResponse(message: string) {
  const lower = message.toLowerCase();
  if (/배너|디자인|이미지|banner|design/.test(lower)) return DEMO_KNOWBAR_RESPONSES.banner;
  if (/카피|광고.?문구|copy|ad.?copy|문구/.test(lower)) return DEMO_KNOWBAR_RESPONSES.copy;
  if (/트렌드|분석|리서치|trend|analy/.test(lower)) return DEMO_KNOWBAR_RESPONSES.trend;
  if (/태스크|할.?일|task|todo|일정.?추가/.test(lower)) return DEMO_KNOWBAR_RESPONSES.task;
  return DEMO_KNOWBAR_RESPONSES.default;
}

/** URL pathname 추출 */
function getPathname(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    if (input.startsWith('/')) return input.split('?')[0];
    try { return new URL(input).pathname; } catch { return input.split('?')[0]; }
  }
  if (input instanceof URL) return input.pathname;
  if (input instanceof Request) return new URL(input.url).pathname;
  return '';
}

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

async function getBody(input: RequestInfo | URL, init?: RequestInit): Promise<Record<string, unknown>> {
  try {
    if (init?.body) return JSON.parse(init.body as string);
    if (input instanceof Request) return await input.clone().json();
  } catch { /* */ }
  return {};
}

/** 메인 인터셉터 설치 */
export function setupDemoInterceptor() {
  if (_installed) return;
  if (typeof window === 'undefined') return;
  _installed = true;

  const _origFetch = window.fetch.bind(window);

  window.fetch = async function demoFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const pathname = getPathname(input);

    // Only intercept /api/* requests
    if (!pathname.startsWith('/api/')) {
      return _origFetch(input, init);
    }

    const method = getMethod(input, init);
    await randomDelay();

    // ─── Route matching ───────────────────────────────

    // Tasks
    if (pathname === '/api/tasks') {
      if (method === 'GET') return json(DEMO_TASKS);
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ id: `demo-new-${Date.now()}`, ...body, status: body.status || 'todo', created_at: new Date().toISOString() }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ ...DEMO_TASKS[0], ...body });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Daily report
    if (pathname === '/api/daily-report') {
      if (method === 'GET') return json(DEMO_DAILY_REPORT);
      if (method === 'POST') return json(DEMO_DAILY_REPORT);
    }

    // Notifications
    if (pathname === '/api/notifications') {
      return json({ notifications: DEMO_NOTIFICATIONS });
    }
    if (pathname === '/api/notifications/settings') {
      if (method === 'PATCH') return json(DEMO_NOTIFICATION_SETTINGS);
      return json(DEMO_NOTIFICATION_SETTINGS);
    }

    // Content calendar
    if (pathname === '/api/content-calendar') {
      if (method === 'GET') return json(DEMO_CONTENT_CALENDAR);
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ id: `demo-cc-${Date.now()}`, ...body, status: 'draft', created_at: new Date().toISOString() }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ ...DEMO_CONTENT_CALENDAR[0], ...body });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Keyword trends
    if (pathname === '/api/trends/keyword-trends') {
      return json(DEMO_KEYWORD_TRENDS);
    }

    // Calendar (Google Calendar)
    if (pathname === '/api/calendar') {
      if (method === 'GET') return json({ connected: true, events: DEMO_CALENDAR_EVENTS });
      if (method === 'POST') return json({ ok: true, event: DEMO_CALENDAR_EVENTS[0] });
    }

    // Trends (articles)
    if (pathname === '/api/trends') {
      if (method === 'GET') return json(DEMO_ARTICLES);
      if (method === 'POST') return json({ success: true, message: '12건 수집 완료 (총 10건 확인)', inserted: 12, total: 10 });
    }

    // Trend summary
    if (pathname === '/api/trends/summary') {
      if (method === 'GET') return json(DEMO_TREND_SUMMARY);
      if (method === 'POST') return json(DEMO_TREND_SUMMARY);
    }

    // Trend ideas
    if (pathname === '/api/trends/ideas') {
      return json({
        ideas: [
          { title: 'AI 마케팅 자동화 입문 가이드', description: '초보 마케터를 위한 AI 도구 활용법 A to Z', platform: 'blog', hook: '"하루 1시간으로 끝내는 마케팅 자동화"', based_on: 'AI 에이전트 트렌드' },
          { title: '릴스로 매출 올리는 5가지 공식', description: '실제 성공 사례 기반 릴스 콘텐츠 포맷 분석', platform: 'instagram', hook: '"이 공식만 알면 릴스 조회수 10배"', based_on: '숏폼 트렌드' },
        ],
      });
    }

    // Trend article (reader)
    if (pathname === '/api/trends/article') {
      return json({ summary: '이 아티클은 AI 에이전트 기술이 마케팅 자동화에 미치는 영향을 분석합니다. 주요 내용으로는 콘텐츠 자동 생성, 광고 캠페인 최적화, 고객 세분화 자동화 등이 있습니다.' });
    }

    // Trend feeds (custom RSS)
    if (pathname === '/api/trends/feeds') {
      if (method === 'GET') return json(DEMO_TREND_FEEDS);
      if (method === 'POST') return json({ ...DEMO_TREND_FEEDS[0], id: `demo-feed-${Date.now()}` }, 201);
      if (method === 'DELETE') return json({ success: true });
    }

    // Competitors
    if (pathname === '/api/competitors') {
      if (method === 'GET') return json(DEMO_COMPETITORS);
      if (method === 'POST') return json({ id: `demo-comp-${Date.now()}`, name: 'New Competitor', created_at: new Date().toISOString() }, 201);
      if (method === 'DELETE') return json({ success: true });
    }

    // Competitor briefing
    if (pathname.match(/^\/api\/competitors\/[^/]+\/briefing/)) {
      return json({ briefing_text: '경쟁사가 최근 릴스 콘텐츠를 주 3회로 늘림. 인게이지먼트율 4.2% 기록.', key_points: ['릴스 빈도 증가', '프로모션 강화', '인플루언서 협업 확대'] });
    }

    // Competitor ads
    if (pathname.match(/^\/api\/competitors\/[^/]+\/ads/)) {
      return json([]);
    }

    // Insights
    if (pathname === '/api/insights') {
      if (method === 'GET') return json(DEMO_INSIGHTS);
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ id: `demo-insight-${Date.now()}`, ...body, created_at: new Date().toISOString() }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ ...DEMO_INSIGHTS[0], ...body });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Memos
    if (pathname === '/api/memos') {
      if (method === 'GET') return json({ memos: DEMO_MEMOS });
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ memo: { id: `demo-memo-${Date.now()}`, ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ memo: { ...DEMO_MEMOS[0], ...body } });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Expenses
    if (pathname === '/api/expenses') {
      if (method === 'GET') return json({ expenses: DEMO_EXPENSES });
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ expense: { id: `demo-exp-${Date.now()}`, ...body, created_at: new Date().toISOString() } }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ expense: { ...DEMO_EXPENSES[0], ...body } });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Promotions
    if (pathname === '/api/promotions') {
      if (method === 'GET') return json({ promotions: DEMO_PROMOTIONS });
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ promotion: { id: `demo-promo-${Date.now()}`, ...body, created_at: new Date().toISOString() } }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ promotion: { ...DEMO_PROMOTIONS[0], ...body } });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Influencers
    if (pathname === '/api/influencers') {
      if (method === 'GET') return json(DEMO_INFLUENCERS);
      if (method === 'POST') {
        const body = await getBody(input, init);
        return json({ influencer: { id: `demo-inf-${Date.now()}`, ...body, created_at: new Date().toISOString() } }, 201);
      }
      if (method === 'PATCH') {
        const body = await getBody(input, init);
        return json({ influencer: { ...DEMO_INFLUENCERS[0], ...body } });
      }
      if (method === 'DELETE') return json({ success: true });
    }

    // Brand guide
    if (pathname === '/api/brand-guide') {
      if (method === 'GET') return json(DEMO_BRAND_GUIDE);
      if (method === 'PUT') {
        const body = await getBody(input, init);
        return json({ ...DEMO_BRAND_GUIDE, ...body });
      }
    }

    // Knowbar (AI chat)
    if (pathname === '/api/knowbar') {
      const body = await getBody(input, init);
      const message = (body.message as string) || '';
      const matched = matchKnowbarResponse(message);
      return json(matched);
    }

    // Settings
    if (pathname === '/api/settings') {
      return json({ claude_api_key_set: true });
    }

    // Token usage
    if (pathname === '/api/tokens') {
      return json({ tokens_in: 1200, tokens_out: 3400, total: 4600 });
    }

    // Activity logs
    if (pathname === '/api/activity') {
      return json(DEMO_NOTIFICATIONS.slice(0, 20));
    }

    // Ads analysis
    if (pathname === '/api/ad-analysis' || pathname === '/api/ads') {
      return json({ analysis: 'ROAS 3.2x 달성. 봄 프로모션 캠페인이 가장 높은 성과.' });
    }

    // Assets
    if (pathname === '/api/assets') {
      return json([]);
    }

    // Google connection check
    if (pathname === '/api/google') {
      return json({ connected: false });
    }
    if (pathname === '/api/google/auth-url') {
      return json({ url: '#demo-google-auth' });
    }

    // Instagram / Threads
    if (pathname === '/api/instagram' || pathname === '/api/threads') {
      return json([]);
    }

    // Weekly goals
    if (pathname === '/api/weekly-goals') {
      return json({ goals: [] });
    }

    // Weekly report
    if (pathname === '/api/weekly-report') {
      return json({ report: null });
    }

    // Performance insights
    if (pathname === '/api/performance-insights') {
      return json({ insights: [] });
    }

    // Marketing calendar
    if (pathname === '/api/marketing-calendar') {
      return json([]);
    }

    // Chat sessions
    if (pathname === '/api/chat' || pathname.startsWith('/api/chat/')) {
      return json([]);
    }

    // Templates
    if (pathname === '/api/templates') {
      return json([]);
    }

    // Banner
    if (pathname === '/api/banner' || pathname.startsWith('/api/banner/')) {
      return json([]);
    }

    // Figma design
    if (pathname === '/api/figma-design' || pathname.startsWith('/api/figma-design/')) {
      return json([]);
    }

    // Blog draft
    if (pathname === '/api/blog-draft') {
      return json([]);
    }

    // Keyword watchlist
    if (pathname === '/api/trends/keyword-watchlist') {
      return json([{ id: 'demo-kw-1', keyword: 'AI마케팅', created_at: new Date().toISOString() }]);
    }

    // ─── Catch-all: return empty 200 to prevent 401 ───
    console.log(`[demo-interceptor] Unmatched route: ${method} ${pathname}`);
    return json({});
  };

  console.log('[demo-interceptor] Fetch interceptor installed');
}

/** 인터셉터 해제 (데모 나가기) */
export function teardownDemoInterceptor() {
  // 페이지 리로드로 처리하므로 명시적 해제는 불필요하지만,
  // localStorage 클린업은 여기서 수행
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dott_ad_analytics');
  localStorage.removeItem('dott-notif-read');
  _installed = false;
}
