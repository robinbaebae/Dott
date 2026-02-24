const TAVILY_API_URL = 'https://api.tavily.com/search';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
  query: string;
}

/**
 * Tavily Search API 호출
 */
async function searchWeb(query: string): Promise<TavilyResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not set — skipping web search');
    return null;
  }

  const res = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!res.ok) {
    console.error(`Tavily API error: ${res.status} ${res.statusText}`);
    return null;
  }

  return res.json();
}

/**
 * 검색 결과를 마크다운 컨텍스트로 포매팅
 */
function formatWebSearchContext(data: TavilyResponse): string {
  const lines: string[] = ['## 🌐 웹 검색 결과'];

  if (data.answer) {
    lines.push(`**요약:** ${data.answer}`);
  }

  if (data.results?.length) {
    lines.push('');
    for (const r of data.results) {
      lines.push(`- **${r.title}** (${r.url})`);
      if (r.content) {
        lines.push(`  ${r.content.slice(0, 200)}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 웹 검색 수행 후 컨텍스트 문자열 반환 (실패 시 빈 문자열)
 */
export async function getWebSearchContext(query: string): Promise<string> {
  try {
    const data = await searchWeb(query);
    if (!data) return '';
    return formatWebSearchContext(data);
  } catch (err) {
    console.error('Web search failed:', err);
    return '';
  }
}
