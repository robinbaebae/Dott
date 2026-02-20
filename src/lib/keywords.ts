import { TrendArticle } from '@/types';

const STOP_WORDS = new Set([
  '그리고', '하지만', '그래서', '그러나', '또한', '이번', '대한', '통해', '위해',
  '에서', '으로', '까지', '부터', '에게', '처럼', '같은', '보다', '라는',
  '것이', '수가', '등의', '것을', '들이', '에는', '에도', '에서는',
  '있는', '하는', '되는', '없는', '않는', '했다', '한다', '된다',
  '기자', '뉴스', '관련', '올해', '지난', '최근', '사진', '제공',
  '진행', '예정', '공개', '발표', '출시', '선보', '소개',
  '트렌드', '패션', '뷰티', 'ai',
]);

interface KeywordResult {
  word: string;
  count: number;
  articles: TrendArticle[];
}

export function extractKeywords(articles: TrendArticle[]): KeywordResult[] {
  const wordMap = new Map<string, { count: number; articles: TrendArticle[] }>();

  for (const article of articles) {
    // 2글자 이상 한글/영문 단어 추출
    const words = article.title.match(/[가-힣a-zA-Z]{2,}/g) ?? [];
    const seen = new Set<string>();

    for (const word of words) {
      const lower = word.toLowerCase();
      if (STOP_WORDS.has(lower)) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);

      const existing = wordMap.get(lower);
      if (existing) {
        existing.count++;
        existing.articles.push(article);
      } else {
        wordMap.set(lower, { count: 1, articles: [article] });
      }
    }
  }

  return Array.from(wordMap.entries())
    .map(([word, data]) => ({ word, count: data.count, articles: data.articles }))
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
