import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';

const TEMPLATES: Record<string, { name: string; prompt: string; variables: string[] }> = {
  // SNS
  'instagram-caption': {
    name: 'Instagram Caption',
    prompt: `다음 정보를 바탕으로 Instagram 캡션을 작성해주세요.
- 매력적인 첫 줄 (hook)
- 본문 (가치 전달)
- CTA
- 관련 해시태그 10-15개
한국어로 작성합니다.`,
    variables: ['topic', 'tone', 'target_audience'],
  },
  'threads-post': {
    name: 'Threads Post',
    prompt: `다음 정보를 바탕으로 Threads 포스트를 작성해주세요.
- 대화형 톤
- 500자 이내
- 공감을 이끄는 내용
한국어로 작성합니다.`,
    variables: ['topic', 'key_message'],
  },
  'hashtag-generator': {
    name: 'Hashtag Generator',
    prompt: `다음 주제에 관련된 해시태그를 생성해주세요.
- 인기 해시태그 10개
- 니치 해시태그 10개
- 브랜드 해시태그 5개
한국어와 영어를 섞어서 작성합니다.`,
    variables: ['topic', 'industry'],
  },
  // Ads
  'ad-headline': {
    name: 'Ad Headline',
    prompt: `다음 정보를 바탕으로 광고 헤드라인 5개를 작성해주세요.
- 각각 다른 어프로치 (혜택, 문제해결, 호기심, 긴급성, 사회적증거)
- 30자 이내
한국어로 작성합니다.`,
    variables: ['product', 'benefit', 'target_audience'],
  },
  'cta-generator': {
    name: 'CTA Generator',
    prompt: `다음 정보를 바탕으로 CTA(Call to Action) 문구 10개를 작성해주세요.
- 행동을 유도하는 동사로 시작
- 긴급성과 가치를 전달
- 다양한 스타일 (직접적, 부드러운, 긴급한 등)
한국어로 작성합니다.`,
    variables: ['product', 'goal'],
  },
  'product-description': {
    name: 'Product Description',
    prompt: `다음 정보를 바탕으로 제품 설명을 작성해주세요.
- 핵심 특징과 혜택
- 타겟 고객의 페인포인트 해결
- 감성적 + 논리적 어필
한국어로 작성합니다.`,
    variables: ['product', 'features', 'target_audience'],
  },
  // Email
  'newsletter-subject': {
    name: 'Newsletter Subject',
    prompt: `다음 정보를 바탕으로 뉴스레터 제목 10개를 작성해주세요.
- 오픈율을 높이는 제목
- 호기심, 혜택, 긴급성 활용
- 50자 이내
한국어로 작성합니다.`,
    variables: ['topic', 'newsletter_name'],
  },
  'newsletter-body': {
    name: 'Newsletter Body',
    prompt: `다음 정보를 바탕으로 뉴스레터 본문을 작성해주세요.
- 인사 + 도입
- 핵심 콘텐츠 (3개 섹션)
- CTA
- 마무리 인사
한국어로 작성합니다.`,
    variables: ['topic', 'key_points', 'cta_goal'],
  },
  'email-cta': {
    name: 'Email CTA',
    prompt: `다음 정보를 바탕으로 이메일 CTA 버튼 텍스트와 주변 문구를 작성해주세요.
- CTA 버튼 텍스트 5개
- 각 CTA 앞뒤 컨텍스트 문구
한국어로 작성합니다.`,
    variables: ['goal', 'offer'],
  },
  // Blog
  'blog-title': {
    name: 'Blog Title',
    prompt: `다음 정보를 바탕으로 블로그 제목 10개를 작성해주세요.
- SEO 최적화
- 클릭을 유도하는 형식 (숫자, 질문, How-to 등)
- 다양한 스타일
한국어로 작성합니다.`,
    variables: ['topic', 'keyword'],
  },
  'blog-outline': {
    name: 'Blog Outline',
    prompt: `다음 정보를 바탕으로 블로그 글 아웃라인을 작성해주세요.
- H2/H3 소제목 구조
- 각 섹션별 핵심 포인트
- SEO 키워드 배치 제안
한국어로 작성합니다.`,
    variables: ['topic', 'keyword', 'target_audience'],
  },
  'blog-intro': {
    name: 'Blog Intro',
    prompt: `다음 정보를 바탕으로 블로그 도입부(인트로)를 작성해주세요.
- 독자의 관심을 끄는 Hook
- 문제 제기 또는 공감
- 글의 가치 미리보기
- 200-300자
한국어로 작성합니다.`,
    variables: ['topic', 'target_audience'],
  },
};

export async function POST(req: NextRequest) {
  try {
    const { templateId, variables } = await req.json();

    const template = TEMPLATES[templateId];
    if (!template) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const variableText = Object.entries(variables || {})
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    const userMessage = `${variableText}`;
    const result = await generateCompletion(template.prompt, userMessage);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate from template' },
      { status: 500 }
    );
  }
}

// GET — return available templates
export async function GET() {
  const templateList = Object.entries(TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    variables: t.variables,
  }));
  return NextResponse.json(templateList);
}
