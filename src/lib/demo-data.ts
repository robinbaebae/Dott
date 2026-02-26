// ═══════════════════════════════════════════════════════════════
// Demo Mock Data — 모든 페이지에서 사용되는 리얼한 데모 데이터
// 날짜는 항상 오늘 기준 동적 생성
// ═══════════════════════════════════════════════════════════════

/* ── Date helpers ── */
const _now = new Date();
/** 오늘 기준 offset 일 (양수=미래, 음수=과거) */
function d(offset: number): string {
  const t = new Date(_now);
  t.setDate(t.getDate() + offset);
  return t.toISOString().split('T')[0];
}
/** 현재 기준 n분 전 ISO string */
function ago(minutes: number): string {
  return new Date(_now.getTime() - minutes * 60_000).toISOString();
}
function uuid(n: number): string {
  return `demo-${String(n).padStart(4, '0')}-${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════
// TASKS (Dashboard + Tasks 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_TASKS = [
  { id: uuid(1), title: '인스타그램 릴스 콘텐츠 기획안 작성', description: '봄 시즌 신제품 런칭에 맞춘 릴스 시리즈 3편 기획. 트렌드 사운드 활용, 15초/30초 두 버전.', status: 'in_progress' as const, due_date: d(1), urgent: true, important: true, created_at: ago(120) },
  { id: uuid(2), title: '봄 프로모션 광고 카피 A/B 테스트', description: 'Meta 광고 캠페인용 카피 3안 작성 + A/B 테스트 세팅. CTA 문구 비교.', status: 'todo' as const, due_date: d(2), urgent: true, important: false, created_at: ago(90) },
  { id: uuid(3), title: 'SEO 키워드 리서치 — AI마케팅 관련', description: '블로그 콘텐츠 전략 수립을 위한 키워드 분석. 검색량, 경쟁도, CPC 조사.', status: 'todo' as const, due_date: d(3), urgent: false, important: true, created_at: ago(200) },
  { id: uuid(4), title: '뉴스레터 3월호 초안 완성', description: '구독자 1,200명 대상 월간 뉴스레터. AI 트렌드 큐레이션 + 자사 업데이트.', status: 'in_progress' as const, due_date: d(0), urgent: false, important: true, created_at: ago(300) },
  { id: uuid(5), title: '인플루언서 협업 제안서 발송', description: '@lifestyle_mina, @tech_joon 에게 봄 캠페인 콜라보 제안 이메일 발송.', status: 'done' as const, due_date: d(-1), urgent: false, important: false, created_at: ago(500) },
  { id: uuid(6), title: '경쟁사 SNS 광고 크리에이티브 분석', description: '마케터리, 그로스팩토리 최근 2주 광고 크리에이티브 수집 및 분석 리포트.', status: 'done' as const, due_date: d(-2), urgent: false, important: true, created_at: ago(600) },
  { id: uuid(7), title: '블로그 포스트 — "2026 숏폼 마케팅 전략"', description: 'SEO 최적화된 블로그 포스트 작성. 2,000자 이상, 키워드: 숏폼마케팅, 릴스전략', status: 'todo' as const, due_date: d(5), urgent: false, important: false, created_at: ago(60) },
  { id: uuid(8), title: 'Meta 광고 주간 성과 리포트 작성', description: '지난주 Meta 광고 캠페인 성과 분석. ROAS, CPA, CTR 핵심 지표 요약.', status: 'on_hold' as const, due_date: d(1), urgent: false, important: false, created_at: ago(400) },
];

// ═══════════════════════════════════════════════════════════════
// DAILY REPORT (Dashboard 브리핑)
// ═══════════════════════════════════════════════════════════════
export const DEMO_DAILY_REPORT = {
  id: uuid(100),
  report_date: d(0),
  report_text: `## 📊 오늘의 AI 마케팅 브리핑

### 🔄 활동 요약
오늘 하루 동안 **8건의 AI 활동**이 수행되었습니다. 마케팅 에이전트가 가장 활발히 활동했으며, 콘텐츠 생성과 트렌드 분석에 집중했습니다.

### 📈 주요 성과
- **릴스 콘텐츠 기획** — 봄 시즌 3편 시리즈 기획 초안 완성
- **키워드 트렌드** — "AI마케팅" 검색량 전주 대비 +145% 급상승
- **광고 성과** — Meta 광고 ROAS 3.2x 달성 (목표 2.5x 초과)

### ✅ 완료된 업무
- 인플루언서 협업 제안서 발송 완료
- 경쟁사 광고 크리에이티브 분석 리포트 작성

### ⚡ 추천 액션
1. 급상승 키워드 "AI마케팅" 관련 블로그 포스트 작성 추천
2. 릴스 콘텐츠 촬영 일정 확정 필요
3. 뉴스레터 3월호 최종 검토 및 발송 예약`,
  stats: {
    actionBreakdown: { chat: 12, task_create: 3, task_complete: 2, trend_refresh: 1, banner_generate: 2, memo_create: 1, figma_design: 1 },
    agentStats: { marketing: 8, design: 3, research: 4, orchestrator: 2 },
    completedTasks: 2,
  },
  created_at: ago(30),
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS (TopBar 알림벨)
// ═══════════════════════════════════════════════════════════════
export const DEMO_NOTIFICATIONS = [
  { id: uuid(200), action_type: 'banner_generate', agent_id: 'design', details: { copy: '봄 프로모션 배너 생성 완료' }, created_at: ago(5) },
  { id: uuid(201), action_type: 'task_create', agent_id: 'orchestrator', details: { title: '인스타그램 릴스 콘텐츠 기획안 작성' }, created_at: ago(15) },
  { id: uuid(202), action_type: 'trend_refresh', agent_id: 'research', details: { inserted: 12 }, created_at: ago(25) },
  { id: uuid(203), action_type: 'chat', agent_id: 'marketing', details: { skill: 'ad_copy', agentName: '마케팅 전문가' }, created_at: ago(35) },
  { id: uuid(204), action_type: 'task_complete', agent_id: 'orchestrator', details: { title: '인플루언서 협업 제안서 발송' }, created_at: ago(60) },
  { id: uuid(205), action_type: 'figma_design', agent_id: 'design', details: { designId: 'demo-figma-1' }, created_at: ago(90) },
  { id: uuid(206), action_type: 'summary_generate', agent_id: 'research', details: { category: 'marketing' }, created_at: ago(120) },
  { id: uuid(207), action_type: 'memo_create', agent_id: null, details: { title: '콘텐츠 아이디어 메모' }, created_at: ago(180) },
  { id: uuid(208), action_type: 'influencer_created', agent_id: 'marketing', details: { name: '라이프스타일 미나', handle: '@lifestyle_mina' }, created_at: ago(240) },
  { id: uuid(209), action_type: 'promotion_create', agent_id: null, details: { name: '봄맞이 20% 할인' }, created_at: ago(300) },
  { id: uuid(210), action_type: 'expense_create', agent_id: null, details: { amount: 500000 }, created_at: ago(360) },
  { id: uuid(211), action_type: 'brand_guide_update', agent_id: null, details: { brand_name: 'Dott' }, created_at: ago(420) },
  { id: uuid(212), action_type: 'chat', agent_id: 'research', details: { skill: 'trend_analysis', agentName: '리서치 전문가' }, created_at: ago(480) },
  { id: uuid(213), action_type: 'task_create', agent_id: 'orchestrator', details: { title: '블로그 포스트 작성' }, created_at: ago(540) },
];

// ═══════════════════════════════════════════════════════════════
// CONTENT CALENDAR (Dashboard + Content 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_CONTENT_CALENDAR = [
  { id: uuid(300), title: '봄 신제품 런칭 릴스', platform: 'instagram', scheduled_date: d(1), scheduled_time: '14:00', status: 'scheduled' as const, content: '봄 시즌 신제품 언박싱 릴스. 트렌드 사운드 활용, 제품 클로즈업 → 착용샷 전환.', notes: '촬영 완료, 편집 중', created_at: ago(200), user_id: 'demo' },
  { id: uuid(301), title: 'AI 마케팅 트렌드 블로그', platform: 'blog', scheduled_date: d(3), scheduled_time: '10:00', status: 'draft' as const, content: '2026년 AI 마케팅 트렌드 총정리. 자동화, 개인화, 숏폼 전략 분석.', notes: 'SEO 키워드 리서치 완료', created_at: ago(150), user_id: 'demo' },
  { id: uuid(302), title: '3월 뉴스레터 — AI 큐레이션', platform: 'newsletter', scheduled_date: d(5), scheduled_time: '09:00', status: 'draft' as const, content: '이달의 AI/마케팅 뉴스 큐레이션 + 자사 업데이트. 구독자 1,200명.', notes: '초안 작성 중', created_at: ago(100), user_id: 'demo' },
  { id: uuid(303), title: '프로모션 카피 인스타 카드뉴스', platform: 'instagram', scheduled_date: d(0), scheduled_time: '18:00', status: 'published' as const, content: '봄맞이 프로모션 20% 할인 카드뉴스 5장. 제품 하이라이트 + 혜택 정리.', notes: '발행 완료', created_at: ago(400), user_id: 'demo' },
  { id: uuid(304), title: '고객 후기 스토리 시리즈', platform: 'instagram', scheduled_date: d(2), scheduled_time: '12:00', status: 'scheduled' as const, content: '실제 고객 후기 기반 인스타 스토리 3개. 텍스트 오버레이 + 제품 태그.', notes: '', created_at: ago(80), user_id: 'demo' },
  { id: uuid(305), title: '숏폼 마케팅 전략 가이드', platform: 'blog', scheduled_date: d(7), scheduled_time: null, status: 'draft' as const, content: '숏폼 콘텐츠 기획부터 제작, 배포까지 A to Z 가이드.', notes: '키워드: 숏폼마케팅, 릴스전략', created_at: ago(50), user_id: 'demo' },
];

// ═══════════════════════════════════════════════════════════════
// KEYWORD TRENDS (Dashboard + Trends 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_KEYWORD_TRENDS = [
  { keyword: 'AI마케팅', change_rate: 145, count: 2840, snapshot_date: d(0), source: 'naver' },
  { keyword: '숏폼전략', change_rate: 89, count: 1560, snapshot_date: d(0), source: 'naver' },
  { keyword: '인플루언서마케팅', change_rate: 52, count: 3200, snapshot_date: d(0), source: 'naver' },
  { keyword: '콘텐츠자동화', change_rate: 38, count: 980, snapshot_date: d(0), source: 'naver' },
  { keyword: '퍼포먼스마케팅', change_rate: 24, count: 4100, snapshot_date: d(0), source: 'naver' },
];

// ═══════════════════════════════════════════════════════════════
// CALENDAR EVENTS (Dashboard 캘린더)
// ═══════════════════════════════════════════════════════════════
export const DEMO_CALENDAR_EVENTS = [
  {
    id: uuid(400),
    title: '마케팅 주간 미팅',
    start: `${d(0)}T10:00:00+09:00`,
    end: `${d(0)}T11:00:00+09:00`,
    allDay: false,
    attendees: [{ name: '김수영', email: 'sy@demo.com' }],
  },
  {
    id: uuid(401),
    title: '콘텐츠 리뷰 미팅',
    start: `${d(1)}T14:00:00+09:00`,
    end: `${d(1)}T15:00:00+09:00`,
    allDay: false,
    attendees: [{ name: '박디자인', email: 'design@demo.com' }],
  },
  {
    id: uuid(402),
    title: '인플루언서 미팅 — @lifestyle_mina',
    start: `${d(3)}T16:00:00+09:00`,
    end: `${d(3)}T17:00:00+09:00`,
    allDay: false,
    attendees: [{ name: '미나', email: 'mina@demo.com' }],
  },
];

// ═══════════════════════════════════════════════════════════════
// ARTICLES (Trends 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_ARTICLES = [
  { id: uuid(500), title: 'AI 에이전트가 바꾸는 마케팅 자동화의 미래', link: 'https://example.com/ai-agent-marketing', source: 'GeekNews', category: 'ai' as const, pub_date: d(-1), content_text: 'AI 에이전트 기술이 마케팅 자동화 영역에서 빠르게 확산되고 있다. 특히 콘텐츠 생성, 광고 최적화, 고객 세분화 분야에서 눈에 띄는 성과를 보이고 있으며...', content_html: '', og_image: '', fetched_at: ago(60), created_at: ago(60) },
  { id: uuid(501), title: '2026 숏폼 콘텐츠 트렌드 — 릴스에서 쇼츠까지', link: 'https://example.com/short-form-2026', source: 'TechCrunch', category: 'marketing' as const, pub_date: d(-1), content_text: '숏폼 콘텐츠 시장이 전년 대비 67% 성장했다. 브랜드들은 릴스, 쇼츠, 틱톡을 통합적으로 활용하는 크로스플랫폼 전략을 채택하고 있으며...', content_html: '', og_image: '', fetched_at: ago(120), created_at: ago(120) },
  { id: uuid(502), title: '구글 SGE 시대의 SEO 전략 변화', link: 'https://example.com/sge-seo', source: 'Search Engine Journal', category: 'tech' as const, pub_date: d(-2), content_text: 'Google의 Search Generative Experience(SGE)가 본격화되면서 기존 SEO 전략에 큰 변화가 요구되고 있다. 키워드 중심에서 의도 중심으로...', content_html: '', og_image: '', fetched_at: ago(180), created_at: ago(180) },
  { id: uuid(503), title: '인플루언서 마케팅 ROI 측정 가이드 2026', link: 'https://example.com/influencer-roi', source: 'MarketingDive', category: 'marketing' as const, pub_date: d(-2), content_text: '인플루언서 마케팅의 ROI를 정확히 측정하는 것이 브랜드들의 최대 과제다. 어트리뷰션 모델, 인게이지먼트 메트릭, 브랜드 리프트 조사를 결합한...', content_html: '', og_image: '', fetched_at: ago(240), created_at: ago(240) },
  { id: uuid(504), title: 'Claude 4.5 출시 — 마케터를 위한 AI 활용법', link: 'https://example.com/claude-marketing', source: 'AI Times', category: 'ai' as const, pub_date: d(-3), content_text: 'Anthropic이 Claude 4.5를 출시하면서 마케팅 분야에서의 AI 활용 가능성이 한층 넓어졌다. 특히 긴 문맥 이해와 구조화된 출력 능력이 향상되어...', content_html: '', og_image: '', fetched_at: ago(300), created_at: ago(300) },
  { id: uuid(505), title: '데이터 기반 콘텐츠 기획 — 감이 아닌 숫자로', link: 'https://example.com/data-driven-content', source: 'Content Marketing Institute', category: 'planning' as const, pub_date: d(-3), content_text: '성공적인 콘텐츠 마케팅을 위해서는 데이터 기반 기획이 필수다. 검색 트렌드, 소셜 시그널, 경쟁사 분석을 통합적으로 활용하는 방법을...', content_html: '', og_image: '', fetched_at: ago(360), created_at: ago(360) },
  { id: uuid(506), title: 'SaaS 마케팅 자동화 툴 비교 — 2026년 최신', link: 'https://example.com/saas-automation', source: 'ProductHunt', category: 'tech' as const, pub_date: d(-4), content_text: '마케팅 자동화 SaaS 시장에서 주목할 만한 신규 툴들이 등장했다. AI 기반 카피라이팅, 자동 A/B 테스트, 퍼널 최적화 등의 기능을 비교 분석하면...', content_html: '', og_image: '', fetched_at: ago(420), created_at: ago(420) },
  { id: uuid(507), title: '이메일 마케팅은 죽지 않았다 — 2026 리바이벌', link: 'https://example.com/email-revival', source: 'HubSpot Blog', category: 'marketing' as const, pub_date: d(-4), content_text: '소셜 미디어의 알고리즘 변화로 오히려 이메일 마케팅의 가치가 재조명되고 있다. 개인화된 자동 시퀀스, AI 기반 발송 시점 최적화 등 새로운 트렌드를...', content_html: '', og_image: '', fetched_at: ago(480), created_at: ago(480) },
  { id: uuid(508), title: '비주얼 마케팅의 새 기준 — AI 디자인 워크플로우', link: 'https://example.com/visual-marketing-ai', source: 'DesignWeek', category: 'planning' as const, pub_date: d(-5), content_text: 'AI 디자인 도구들이 마케팅 비주얼 제작 워크플로우를 혁신하고 있다. Figma, Canva, 그리고 새로운 AI 네이티브 도구들을 활용한 효율적인 디자인 파이프라인을...', content_html: '', og_image: '', fetched_at: ago(540), created_at: ago(540) },
  { id: uuid(509), title: '퍼포먼스 마케팅 트렌드 — CPA에서 LTV로', link: 'https://example.com/performance-ltv', source: 'AdAge', category: 'marketing' as const, pub_date: d(-5), content_text: '퍼포먼스 마케팅의 패러다임이 단순 CPA 최적화에서 고객 생애 가치(LTV) 기반으로 전환되고 있다. 이에 따른 어트리뷰션 전략과 예산 배분 방법을...', content_html: '', og_image: '', fetched_at: ago(600), created_at: ago(600) },
];

// ═══════════════════════════════════════════════════════════════
// TREND SUMMARY (Trends AI 요약)
// ═══════════════════════════════════════════════════════════════
export const DEMO_TREND_SUMMARY = {
  id: uuid(600),
  summary_date: d(0),
  summary_text: JSON.stringify({
    trends: [
      { topic: 'AI 에이전트 마케팅 자동화', summary: 'AI 에이전트가 콘텐츠 생성, 광고 최적화, 고객 응대까지 자동화하는 추세가 가속화되고 있음.', implication: '단순 도구 활용을 넘어 에이전트 기반 워크플로우 구축이 경쟁력의 핵심이 될 것.', impact: 'high', category: 'ai', sources: [0, 4] },
      { topic: '숏폼 콘텐츠 크로스플랫폼 전략', summary: '릴스, 쇼츠, 틱톡을 통합 관리하는 크로스플랫폼 숏폼 전략이 대세로 부상.', implication: '하나의 콘텐츠를 멀티 플랫폼에 최적화하는 리퍼포징 전략 수립 필요.', impact: 'high', category: 'marketing', sources: [1] },
      { topic: 'SGE 시대의 SEO 전략 전환', summary: 'Google SGE 도입으로 기존 키워드 중심 SEO에서 의도 기반, 구조화된 콘텐츠 전략으로 전환 필요.', implication: '롱테일 키워드보다 종합적인 토픽 클러스터 전략이 더 효과적.', impact: 'medium', category: 'tech', sources: [2] },
      { topic: '이메일 마케팅 리바이벌', summary: '소셜 알고리즘 변화로 이메일의 가치 재조명. AI 개인화와 발송 시점 최적화가 핵심.', implication: '뉴스레터 구독자 확보와 시퀀스 자동화에 투자 확대 권장.', impact: 'medium', category: 'marketing', sources: [7] },
    ],
    action_points: [
      'AI 에이전트 기반 마케팅 워크플로우 파일럿 프로젝트 시작',
      '릴스/쇼츠 크로스플랫폼 콘텐츠 템플릿 제작',
      'SEO 전략을 토픽 클러스터 기반으로 재수립',
      '뉴스레터 구독 퍼널 개선 및 자동 시퀀스 설계',
    ],
  }),
  article_ids: [uuid(500), uuid(501), uuid(502), uuid(507)],
  created_at: ago(30),
};

// ═══════════════════════════════════════════════════════════════
// COMPETITORS (Trends 경쟁사)
// ═══════════════════════════════════════════════════════════════
export const DEMO_COMPETITORS = [
  { id: uuid(700), name: '마케터리', website_url: 'https://marketerry.io', meta_page_id: null, sns_handles: { instagram: '@marketerry_official', twitter: '@marketerry' }, created_at: ago(1440) },
  { id: uuid(701), name: '그로스팩토리', website_url: 'https://growthfactory.kr', meta_page_id: null, sns_handles: { instagram: '@growthfactory_kr' }, created_at: ago(2880) },
];

// ═══════════════════════════════════════════════════════════════
// INSIGHTS (Insight 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_INSIGHTS = [
  { id: uuid(800), url: 'https://example.com/ai-agent-marketing', title: 'AI 에이전트가 바꾸는 마케팅 자동화의 미래', description: 'AI 에이전트 기술이 마케팅 자동화 영역에서 빠르게 확산되고 있다.', memo: '우리 제품에 적용할 수 있는 에이전트 워크플로우 아이디어 정리 필요', tags: ['AI', '자동화', '마케팅'], content_type: 'article' as const, thumbnail_url: '', source_domain: 'example.com', created_at: ago(120) },
  { id: uuid(801), url: '', title: '봄 캠페인 타겟 오디언스 메모', description: '25-34세 여성, 패션/뷰티 관심, 인스타그램 활성 사용자. 라이프스타일 콘텐츠 선호.', memo: '', tags: ['타겟팅', '봄캠페인'], content_type: 'memory' as const, thumbnail_url: '', source_domain: 'dott', created_at: ago(240) },
  { id: uuid(802), url: 'https://example.com/short-form-2026', title: '2026 숏폼 콘텐츠 트렌드', description: '숏폼 콘텐츠 시장이 전년 대비 67% 성장', memo: '리퍼포징 전략 참고', tags: ['숏폼', '트렌드'], content_type: 'article' as const, thumbnail_url: '', source_domain: 'example.com', created_at: ago(360) },
  { id: uuid(803), url: 'https://youtube.com/watch?v=demo123', title: '인플루언서 협업 성공 사례 모음', description: '중소 브랜드의 인플루언서 마케팅 ROI 극대화 전략 비디오', memo: '우리 예산 규모에 맞는 마이크로 인플루언서 전략 참고', tags: ['인플루언서', 'ROI'], content_type: 'video' as const, thumbnail_url: '', source_domain: 'youtube.com', created_at: ago(480) },
  { id: uuid(804), url: '', title: '주간 회의 핵심 내용 — 콘텐츠 방향성', description: '릴스 비중 40%, 블로그 30%, 뉴스레터 20%, 기타 10%로 콘텐츠 비중 조정 합의', memo: '', tags: ['회의록', '콘텐츠전략'], content_type: 'memory' as const, thumbnail_url: '', source_domain: 'dott', created_at: ago(600) },
];

// ═══════════════════════════════════════════════════════════════
// MEMOS (Memo 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_MEMOS = [
  { id: uuid(900), title: '봄 캠페인 카피 아이디어', content: '봄바람처럼 가볍게, 당신의 일상에 스며드는 [브랜드명]\n\n#봄캠페인 #카피 #브랜딩\n\n카피안 1: "봄, 새로운 시작을 함께"\n카피안 2: "가볍게 시작하는 봄의 변화"\n카피안 3: "봄 햇살처럼 따뜻한 선택"', tags: ['봄캠페인', '카피', '브랜딩'], pinned: true, deleted_at: null, created_at: ago(120), updated_at: ago(60), user_id: 'demo' },
  { id: uuid(901), title: '경쟁사 분석 포인트', content: '마케터리: SNS 콘텐츠 퀄리티 높음, 릴스 참여율 4.2%\n그로스팩토리: 퍼포먼스 중심, 블로그 SEO 강함\n\n#경쟁사분석 #벤치마킹\n\n우리 차별점: AI 에이전트 기반 자동화 + 올인원 플랫폼', tags: ['경쟁사분석', '벤치마킹'], pinned: false, deleted_at: null, created_at: ago(300), updated_at: ago(200), user_id: 'demo' },
  { id: uuid(902), title: '뉴스레터 구독 퍼널 개선안', content: '현재: 랜딩페이지 → 구독폼\n개선: 블로그 → 리드마그넷(PDF) → 구독 → 웰컴 시퀀스\n\n#뉴스레터 #퍼널\n\n예상 구독 전환율 +35%', tags: ['뉴스레터', '퍼널'], pinned: false, deleted_at: null, created_at: ago(500), updated_at: ago(400), user_id: 'demo' },
  { id: uuid(903), title: '릴스 촬영 체크리스트', content: '✅ 조명 세팅 (링라이트 + 자연광)\n✅ 트렌드 사운드 선정\n✅ 스크립트/스토리보드 준비\n⬜ 소품 준비\n⬜ 썸네일 디자인\n\n#릴스 #촬영', tags: ['릴스', '촬영'], pinned: false, deleted_at: null, created_at: ago(180), updated_at: ago(100), user_id: 'demo' },
];

// ═══════════════════════════════════════════════════════════════
// EXPENSES (Ledger 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_EXPENSES = [
  { id: uuid(1000), date: d(-1), description: 'Meta 광고비 — 봄 프로모션 캠페인', amount: 500000, category: '광고비', payment_method: '법인카드', memo: '2주 캠페인 첫 주 예산', created_at: ago(120), updated_at: ago(120), user_id: 'demo' },
  { id: uuid(1001), date: d(-2), description: '인플루언서 협업비 — @lifestyle_mina', amount: 300000, category: '인플루언서', payment_method: '계좌이체', memo: '릴스 1건 + 스토리 2건', created_at: ago(240), updated_at: ago(240), user_id: 'demo' },
  { id: uuid(1002), date: d(-3), description: '콘텐츠 촬영 소품 구매', amount: 85000, category: '콘텐츠', payment_method: '법인카드', memo: '봄 시즌 소품 세트', created_at: ago(360), updated_at: ago(360), user_id: 'demo' },
  { id: uuid(1003), date: d(-5), description: 'Canva Pro 월간 구독', amount: 15000, category: '구독/서비스', payment_method: '법인카드', memo: '디자인 툴 구독', created_at: ago(480), updated_at: ago(480), user_id: 'demo' },
  { id: uuid(1004), date: d(-7), description: 'Google Ads 크레딧 충전', amount: 200000, category: '광고비', payment_method: '법인카드', memo: '검색 광고 캠페인', created_at: ago(600), updated_at: ago(600), user_id: 'demo' },
  { id: uuid(1005), date: d(-10), description: '스톡 이미지 라이선스', amount: 45000, category: '콘텐츠', payment_method: '법인카드', memo: '블로그/SNS용 이미지 10건', created_at: ago(720), updated_at: ago(720), user_id: 'demo' },
  { id: uuid(1006), date: d(-12), description: '마케팅 세미나 참가비', amount: 55000, category: '교육/세미나', payment_method: '법인카드', memo: 'AI 마케팅 컨퍼런스', created_at: ago(840), updated_at: ago(840), user_id: 'demo' },
  { id: uuid(1007), date: d(-14), description: '이메일 마케팅 툴 연간 구독', amount: 120000, category: '구독/서비스', payment_method: '법인카드', memo: 'Mailchimp 연간 플랜', created_at: ago(960), updated_at: ago(960), user_id: 'demo' },
];

// ═══════════════════════════════════════════════════════════════
// PROMOTIONS (Promotion 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_PROMOTIONS = [
  { id: uuid(1100), name: '봄맞이 20% 할인', type: '할인율', discount_value: '20%', target: '전체', start_date: d(-3), end_date: d(11), budget: 1000000, goal: '신규 고객 확보 + 시즌 매출 달성', description: '봄 시즌 맞이 전 제품 20% 할인. 신규 가입자 추가 5% 쿠폰.', ai_copy: '봄바람처럼 가볍게! 전 제품 20% 할인 🌸 지금 바로 만나보세요.', status: 'active' as const, created_at: ago(500), updated_at: ago(100), user_id: 'demo' },
  { id: uuid(1101), name: '신제품 런칭 이벤트', type: '사은품', discount_value: '선착순 100명 미니 키트', target: '신규고객', start_date: d(5), end_date: d(19), budget: 500000, goal: '신제품 인지도 확보', description: '신제품 구매 고객 대상 미니 키트 증정. 선착순 100명.', ai_copy: '새로운 시작을 함께! 🎁 신제품 구매시 미니 키트 증정 (선착순)', status: 'draft' as const, created_at: ago(200), updated_at: ago(200), user_id: 'demo' },
  { id: uuid(1102), name: '2월 VIP 전용 할인', type: '할인율', discount_value: '30%', target: 'VIP', start_date: d(-30), end_date: d(-2), budget: 300000, goal: 'VIP 리텐션', description: 'VIP 등급 고객 전용 30% 할인 프로모션.', ai_copy: 'VIP만을 위한 특별 혜택 💜 30% 할인으로 보답합니다.', status: 'ended' as const, created_at: ago(2000), updated_at: ago(100), user_id: 'demo' },
];

// ═══════════════════════════════════════════════════════════════
// INFLUENCERS (Influencer 페이지)
// ═══════════════════════════════════════════════════════════════
export const DEMO_INFLUENCERS = [
  { id: uuid(1200), name: '라이프스타일 미나', handle: '@lifestyle_mina', platform: 'instagram', followers: 45000, engagement_rate: 4.2, category: '라이프스타일', bio: '일상을 아름답게 ✨ 패션/뷰티/리빙 크리에이터', email: 'mina@creator.com', phone: null, profile_image_url: null, avg_likes: 1890, avg_comments: 156, price_range: '30-50만원', notes: '봄 캠페인 콜라보 진행중', tags: ['라이프스타일', '패션', '뷰티'], user_id: 'demo', created_at: ago(500), updated_at: ago(100) },
  { id: uuid(1201), name: '테크 준', handle: '@tech_joon', platform: 'youtube', followers: 120000, engagement_rate: 3.8, category: '테크/리뷰', bio: 'IT 제품 리뷰 & 테크 트렌드 분석 📱', email: 'joon@techreview.com', phone: null, profile_image_url: null, avg_likes: 4560, avg_comments: 320, price_range: '50-100만원', notes: '제품 리뷰 영상 제안 예정', tags: ['테크', '리뷰', '유튜브'], user_id: 'demo', created_at: ago(400), updated_at: ago(200) },
  { id: uuid(1202), name: '푸디 소연', handle: '@foodie_soyeon', platform: 'instagram', followers: 28000, engagement_rate: 5.1, category: 'F&B', bio: '맛집 탐방 & 홈카페 레시피 🍰', email: 'soyeon@foodie.com', phone: null, profile_image_url: null, avg_likes: 1428, avg_comments: 89, price_range: '20-30만원', notes: '카페 콜라보 가능', tags: ['맛집', '카페', '레시피'], user_id: 'demo', created_at: ago(300), updated_at: ago(300) },
  { id: uuid(1203), name: '트래블 현우', handle: '@travel_hyunwoo', platform: 'instagram', followers: 67000, engagement_rate: 3.5, category: '여행', bio: '세계 여행 & 국내 숨은 명소 🌍', email: 'hw@travel.com', phone: null, profile_image_url: null, avg_likes: 2345, avg_comments: 178, price_range: '40-70만원', notes: '', tags: ['여행', '사진', '브이로그'], user_id: 'demo', created_at: ago(600), updated_at: ago(600) },
  { id: uuid(1204), name: '핏니스 다은', handle: '@fit_daeun', platform: 'youtube', followers: 89000, engagement_rate: 4.0, category: '피트니스', bio: '홈트레이닝 & 건강한 라이프스타일 💪', email: 'daeun@fitness.com', phone: null, profile_image_url: null, avg_likes: 3560, avg_comments: 245, price_range: '50-80만원', notes: '건강 제품 협업 가능', tags: ['피트니스', '건강', '유튜브'], user_id: 'demo', created_at: ago(700), updated_at: ago(700) },
];

// ═══════════════════════════════════════════════════════════════
// BRAND GUIDE (Settings)
// ═══════════════════════════════════════════════════════════════
export const DEMO_BRAND_GUIDE = {
  id: 'demo',
  brand_name: 'Dott',
  brand_description: 'AI 기반 올인원 마케팅 플랫폼. 콘텐츠 기획부터 광고 운영, 트렌드 분석까지 AI 에이전트가 함께합니다.',
  target_audience: '1인 마케터, 스타트업 마케팅팀, 소규모 브랜드 운영자',
  tone: 'friendly' as const,
  keywords: ['AI마케팅', '자동화', '올인원', '스마트마케팅', '콘텐츠'],
  avoid_keywords: ['저렴한', '무료', '공짜'],
  website_url: 'https://dott.marketing',
  additional_notes: '보라색(#5B4D6E) 기반 브랜드 컬러. 전문적이면서도 친근한 톤앤매너 유지.',
  product_type: 'SaaS',
  industry: '마케팅 테크',
  competitors: ['마케터리', '그로스팩토리'],
  usp: 'AI 에이전트 기반 마케팅 자동화 — 기획부터 실행까지 원스톱',
  pricing_model: '월간 구독',
  customer_pain_points: ['마케팅 인력 부족', '콘텐츠 생산 속도', '트렌드 파악 어려움', '광고 성과 분석 복잡'],
  key_features: ['AI 채팅 어시스턴트', '콘텐츠 자동 생성', '트렌드 큐레이션', '광고 성과 분석', '인플루언서 관리'],
  company_size: '스타트업',
  updated_at: ago(100),
};

// ═══════════════════════════════════════════════════════════════
// AD ANALYTICS (Ads 페이지 — localStorage)
// ═══════════════════════════════════════════════════════════════
function generateAdRows() {
  const campaigns = ['봄 프로모션 — 인지도', '봄 프로모션 — 전환', '신제품 런칭'];
  const adSets = ['2534_여성_패션뷰티', '2544_전체_관심사', '1834_전체_LAL'];
  const creatives = ['릴스_언박싱_15s', '카드뉴스_혜택정리', '싱글이미지_제품컷', '스토리_후기모음'];
  const rows: string[] = [];
  rows.push('date,campaign,adSet,creative,impressions,reach,frequency,clicks,linkClicks,ctrAll,ctrLink,cpc,cpm,spend,conversions,convValue,roas');
  for (let i = 13; i >= 0; i--) {
    const date = d(-i);
    const camp = campaigns[i % 3];
    const adSet = adSets[i % 3];
    const creative = creatives[i % 4];
    const impressions = 8000 + Math.floor(Math.random() * 7000);
    const reach = Math.floor(impressions * (0.7 + Math.random() * 0.2));
    const frequency = +(impressions / reach).toFixed(2);
    const clicks = Math.floor(impressions * (0.02 + Math.random() * 0.03));
    const linkClicks = Math.floor(clicks * 0.7);
    const ctrAll = +((clicks / impressions) * 100).toFixed(2);
    const ctrLink = +((linkClicks / impressions) * 100).toFixed(2);
    const spend = Math.floor(30000 + Math.random() * 20000);
    const cpc = Math.floor(spend / clicks);
    const cpm = Math.floor((spend / impressions) * 1000);
    const conversions = Math.floor(linkClicks * (0.05 + Math.random() * 0.1));
    const convValue = conversions * (25000 + Math.floor(Math.random() * 15000));
    const roas = +(convValue / spend).toFixed(2);
    rows.push(`${date},${camp},${adSet},${creative},${impressions},${reach},${frequency},${clicks},${linkClicks},${ctrAll},${ctrLink},${cpc},${cpm},${spend},${conversions},${convValue},${roas}`);
  }
  return rows.join('\n');
}

export const DEMO_AD_ANALYTICS = {
  version: 1 as const,
  meta: {
    rows: [] as Array<Record<string, unknown>>, // will be parsed by Ads page from CSV
    uploads: [{ fileName: 'demo_meta_ads.csv', uploadedAt: ago(30), rowCount: 14 }],
  },
  google: { rows: [], uploads: [] },
};

export const DEMO_AD_CSV = generateAdRows();

// ═══════════════════════════════════════════════════════════════
// BANNER HTML (Chat 배너 프리뷰)
// ═══════════════════════════════════════════════════════════════
export const DEMO_BANNER_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #5B4D6E 0%, #8B7BA0 50%, #E0D5DE 100%); font-family: 'Pretendard', sans-serif; overflow: hidden; }
  .container { text-align: center; color: white; padding: 80px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 8px 24px; border-radius: 20px; font-size: 16px; letter-spacing: 2px; margin-bottom: 32px; }
  h1 { font-size: 56px; font-weight: 800; line-height: 1.3; margin-bottom: 20px; text-shadow: 0 2px 20px rgba(0,0,0,0.15); }
  .accent { color: #BFFF00; }
  p { font-size: 22px; opacity: 0.9; line-height: 1.6; margin-bottom: 40px; }
  .cta { display: inline-block; background: white; color: #5B4D6E; padding: 16px 48px; border-radius: 12px; font-size: 20px; font-weight: 700; text-decoration: none; }
</style></head>
<body>
  <div class="container">
    <div class="badge">SPRING 2026</div>
    <h1>봄, 새로운 시작을<br><span class="accent">함께</span> 하세요</h1>
    <p>전 제품 20% 할인 · 신규 가입 추가 5% 쿠폰</p>
    <div class="cta">지금 만나보기 →</div>
  </div>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════
// KNOWBAR RESPONSES (Chat AI 응답)
// ═══════════════════════════════════════════════════════════════
export const DEMO_KNOWBAR_RESPONSES: Record<string, {
  response: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  skill: string;
  bannerId?: string;
  bannerHtml?: string;
  taskCreated?: boolean;
  taskTitle?: string;
}> = {
  banner: {
    response: `봄 프로모션 배너를 만들었어요! 🌸

**디자인 컨셉:**
- 그라데이션 보라색 배경 (브랜드 컬러 활용)
- "봄, 새로운 시작을 함께 하세요" 메인 카피
- 20% 할인 + 신규 가입 쿠폰 혜택 강조
- 깔끔한 CTA 버튼

수정이 필요하면 말씀해주세요! 색상, 카피, 레이아웃 변경 모두 가능합니다.`,
    agentId: 'design',
    agentName: '디자인 전문가',
    agentIcon: '🎨',
    skill: 'banner_generate',
    bannerId: 'demo-banner-001',
    bannerHtml: DEMO_BANNER_HTML,
  },
  copy: {
    response: `봄 프로모션 광고 카피 3안을 준비했어요! 📝

---

**안 1 — 감성형**
> 봄바람처럼 가볍게, 당신의 일상에 스며드는 변화 🌿
> 전 제품 20% 할인 | 지금 바로 만나보세요

**안 2 — 혜택 강조형**
> 🌸 봄맞이 특별 혜택!
> 최대 20% 할인 + 신규 가입시 추가 5% 쿠폰
> 3/1 ~ 3/14 한정

**안 3 — 행동 유도형**
> 새 시즌, 새로운 나를 위한 선택
> 봄 한정 20% OFF → 지금 바로 시작하기
> ✨ 선착순 한정 수량

---

**추천:** A/B 테스트로 안 1(감성)과 안 2(혜택)를 비교하면 타겟 반응 차이를 명확히 확인할 수 있어요. Meta 광고에서는 혜택형이 CTR이 보통 15-20% 높습니다.`,
    agentId: 'marketing',
    agentName: '마케팅 전문가',
    agentIcon: '📝',
    skill: 'ad_copy',
  },
  trend: {
    response: `이번 주 마케팅 트렌드를 분석했어요! 🔍

## 📈 주간 핵심 트렌드

### 1. AI 에이전트 마케팅 자동화 (Impact: HIGH)
AI 에이전트가 콘텐츠 기획 → 제작 → 배포까지 자동화하는 풀스택 마케팅이 급부상. 특히 **릴스 자동 기획, A/B 테스트 자동화** 사례가 늘고 있습니다.

→ 💡 **액션:** 우리 제품의 AI 에이전트 워크플로우를 케이스 스터디로 만들면 좋은 마케팅 자산이 될 수 있어요.

### 2. 숏폼 콘텐츠 크로스플랫폼 전략 (Impact: HIGH)
릴스/쇼츠/틱톡을 통합 관리하는 전략이 대세. 하나의 콘텐츠를 **3개 플랫폼에 최적화**하는 리퍼포징이 핵심.

→ 💡 **액션:** 봄 캠페인 릴스를 쇼츠/틱톡 버전으로도 변환하는 것을 추천해요.

### 3. 이메일 마케팅 리바이벌 (Impact: MEDIUM)
소셜 알고리즘 변화로 이메일의 가치가 재조명. AI 개인화 + 발송 시점 최적화가 핵심 트렌드.

→ 💡 **액션:** 뉴스레터 구독자 확보 퍼널 개선 + 웰컴 시퀀스 자동화를 우선 검토해보세요.

---

**키워드 동향:** AI마케팅 +145%, 숏폼전략 +89%, 인플루언서마케팅 +52%`,
    agentId: 'research',
    agentName: '리서치 전문가',
    agentIcon: '🔍',
    skill: 'trend_analysis',
  },
  task: {
    response: `태스크를 생성했어요! ✅

**"인스타그램 릴스 콘텐츠 기획안 작성"** 이(가) 할 일에 추가되었습니다.

📋 태스크 상세:
- **우선순위:** 긴급 + 중요
- **마감일:** 내일
- **설명:** 봄 시즌 신제품 런칭 릴스 시리즈 기획

바로 Tasks 페이지에서 확인할 수 있어요. 추가로 필요한 업무가 있으면 말씀해주세요!`,
    agentId: 'orchestrator',
    agentName: '오케스트레이터',
    agentIcon: '🎯',
    skill: 'task_create',
    taskCreated: true,
    taskTitle: '인스타그램 릴스 콘텐츠 기획안 작성',
  },
  default: {
    response: `안녕하세요! Dott AI 마케팅 어시스턴트입니다 👋

무엇을 도와드릴까요? 몇 가지 추천 작업이에요:

- 🎨 **"봄 프로모션 배너 만들어줘"** — 배너 디자인 생성
- 📝 **"광고 카피 작성해줘"** — A/B 테스트용 카피 3안
- 🔍 **"트렌드 분석해줘"** — 주간 마케팅 트렌드 리포트
- ✅ **"릴스 기획안 작성 태스크 추가해줘"** — 태스크 생성
- 📅 **"내일 2시에 콘텐츠 리뷰 미팅 잡아줘"** — 캘린더 일정

어떤 작업이든 말씀해주세요! AI 에이전트가 바로 처리해드립니다.`,
    agentId: 'marketing',
    agentName: '마케팅 전문가',
    agentIcon: '📝',
    skill: 'general',
  },
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION SETTINGS
// ═══════════════════════════════════════════════════════════════
export const DEMO_NOTIFICATION_SETTINGS = {
  task_create: true,
  task_complete: true,
  trend_refresh: true,
  banner_generate: true,
  chat: false,
  summary_generate: true,
};

// ═══════════════════════════════════════════════════════════════
// TREND FEEDS (Custom RSS feeds)
// ═══════════════════════════════════════════════════════════════
export const DEMO_TREND_FEEDS = [
  { id: uuid(1300), name: 'GeekNews', url: 'https://news.hada.io/rss', category: 'tech', enabled: true },
  { id: uuid(1301), name: 'TechCrunch', url: 'https://techcrunch.com/feed', category: 'tech', enabled: true },
];
