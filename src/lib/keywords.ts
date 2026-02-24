import { TrendArticle } from '@/types';

// 일반적인 한국어 단어 (조사, 부사, 일반 동사/형용사, 뉴스 상투어 등)
const STOP_WORDS = new Set([
  // 조사/접속사/부사
  '그리고', '하지만', '그래서', '그러나', '또한', '이번', '대한', '통해', '위해',
  '에서', '으로', '까지', '부터', '에게', '처럼', '같은', '보다', '라는', '만큼',
  '것이', '수가', '등의', '것을', '들이', '에는', '에도', '에서는', '으로는',
  // 일반 동사/형용사 어간
  '있는', '하는', '되는', '없는', '않는', '했다', '한다', '된다', '있다', '없다',
  '가능', '필요', '중요', '새로운', '다양한', '주요', '향후', '기존', '전체',
  // 뉴스 상투어
  '기자', '뉴스', '관련', '올해', '지난', '최근', '사진', '제공', '보도', '분석',
  '진행', '예정', '공개', '발표', '출시', '선보', '소개', '확대', '강화', '추진',
  '나서', '밝혔', '전했', '설명', '지적', '강조', '평가', '전망', '조사', '연구',
  // 일반 명사 (너무 포괄적)
  '트렌드', '서비스', '플랫폼', '기업', '기술', '시장', '업계', '전문', '산업',
  '사업', '경쟁', '성장', '투자', '매출', '수익', '전략', '방법', '활용', '도입',
  '운영', '관리', '개발', '구축', '제공', '지원', '확보', '달성', '목표', '계획',
  '결과', '효과', '변화', '혁신', '미래', '글로벌', '국내', '해외', '세계', '한국',
  '데이터', '디지털', '모바일', '온라인', '솔루션', '시스템', '프로세스',
  '마케팅', '콘텐츠', '고객', '소비자', '브랜드', '광고', '캠페인',
  '미디어', '소셜', '커머스', '이커머스', '비즈니스', '스타트업',
  '시대', '패션', '뷰티', '트래픽', '퍼포먼스', '인공지능',
  '세미나', '컨퍼런스', '리포트', '보고서', '백서', '가이드',
  '프로그램', '프로젝트', '네트워크', '인프라', '아키텍처',
  '보고', '넘어', '인간', '기반', '가지', '분야', '방식', '측면', '경우',
  '키워드', '검색', '보안', '자동', '생성', '구현', '적용', '대응', '영향',
  '이용', '사용', '포함', '대표', '참여', '발견', '실현', '도전', '협력',
  '상황', '내용', '부분', '정보', '문제', '개념', '형태', '수준', '단계',
  '핵심', '총정리', '의료', '있습니다', '합니다', '됩니다', '입니다', '것입니다',
  '트렌드를', '어떻게', '무엇', '누구', '언제', '어디', '왜냐하면',
  '기획', '제시', '역할', '가능성', '필요성', '중요성', '방향', '환경',
  '것인', '믹스', '주목', '활동', '요소', '분류', '구분', '항목', '종류',
  '소비', '이해', '성공', '실패', '경험', '도움', '제작', '등장',
  '바뀌고', '칼럼', '매진', '신청', '누적', '대담', '연속',
  '전환', '중심', '통합', '연결', '실행', '모델', '채널', '트래킹',
  '이상', '이하', '대비', '기준', '현재', '이후', '이전', '당시', '이미',
  '올해', '내년', '작년', '상반기', '하반기', '분기', '연간', '월간', '주간',
  // 숫자 관련
  '만원', '억원', '조원', '증가', '감소', '상승', '하락',
  // 영문 일반어
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'will',
  'new', 'top', 'best', 'how', 'what', 'why', 'can', 'not', 'all', 'its',
  'ai', 'it', 'to', 'in', 'of', 'is', 'at', 'on', 'by', 'an',
]);

// 조사가 붙은 형태 패턴 (정규식)
const SUFFIX_PATTERNS = [
  /^.+(에서|으로|에게|처럼|같은|보다|라는|에는|에도|까지|부터|만큼|이다|이며|이고|에서는|으로는|에게는)$/,
  /^.+(하는|되는|있는|없는|했다|한다|된다|하고|되고|하며|되며|하면|되면)$/,
  /^.+(들의|들은|들이|들을|들에|에의|으의|에게|로서|로써)$/,
  /^.+(트렌드를|관련된|대한|위한|통한|따른|인한|같은|있는|없는)$/,
  /^.+(바뀌고|되고|하고|나고|지고|오고|가고|주고|받고|쓰고)$/,
  /^.+(해야|돼야|봐야|알아야|가야|써야)$/,
];

interface KeywordResult {
  word: string;
  count: number;
  articles: TrendArticle[];
}

/**
 * 고유명사/SEO 키워드 위주로 추출
 * - 영문 키워드: 2글자 이상 (브랜드명, 기술명 등)
 * - 한글 키워드: 조사 제거 후 2~6글자 (너무 긴 건 문장 조각)
 * - 빈도 3회 이상만 (노이즈 제거)
 * - 최대 10개
 */
export function extractKeywords(articles: TrendArticle[]): KeywordResult[] {
  const wordMap = new Map<string, { count: number; articles: TrendArticle[] }>();

  for (const article of articles) {
    const seen = new Set<string>();

    // 영문 단어/약어 추출 (GPT, SaaS, ChatGPT, OpenAI 등)
    const engWords = article.title.match(/[A-Za-z][A-Za-z0-9.]+/g) ?? [];
    for (const w of engWords) {
      // 원본 케이스 유지 (GPT, OpenAI 등 고유명사)
      const key = w.length <= 5 ? w.toUpperCase() : w;
      if (key.length < 2) continue;
      if (STOP_WORDS.has(key.toLowerCase())) continue;
      if (seen.has(key.toLowerCase())) continue;
      seen.add(key.toLowerCase());
      addToMap(wordMap, key, article);
    }

    // 한글 명사 추출 (3~6글자, 조사 제거)
    const korWords = article.title.match(/[가-힣]{2,8}/g) ?? [];
    for (let w of korWords) {
      // 조사/어미 패턴 매칭 시 스킵
      if (SUFFIX_PATTERNS.some((p) => p.test(w))) continue;

      // 끝에 흔한 조사 1글자 제거: 은/는/이/가/을/를/의/와/과/로/도/만/서
      w = w.replace(/[은는이가을를의와과로도만서]$/, '');

      if (w.length < 2 || w.length > 6) continue;
      const lower = w.toLowerCase();
      if (STOP_WORDS.has(lower)) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      addToMap(wordMap, w, article);
    }
  }

  return Array.from(wordMap.entries())
    .map(([word, data]) => ({ word, count: data.count, articles: data.articles }))
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function addToMap(
  map: Map<string, { count: number; articles: TrendArticle[] }>,
  word: string,
  article: TrendArticle
) {
  const existing = map.get(word);
  if (existing) {
    existing.count++;
    existing.articles.push(article);
  } else {
    map.set(word, { count: 1, articles: [article] });
  }
}
