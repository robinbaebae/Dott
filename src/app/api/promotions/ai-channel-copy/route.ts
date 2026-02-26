import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { logActivity } from '@/lib/activity';

const CHANNEL_TONE: Record<string, string> = {
  instagram: '캐주얼하고 트렌디한 톤. 이모지 적극 활용. 짧고 임팩트 있는 문구. 해시태그 포함.',
  facebook: '친근하고 정보적인 톤. 스토리텔링 활용. 공유 유도 CTA.',
  google: '검색 광고 스타일. 핵심 키워드 중심. 간결한 헤드라인 + 설명문.',
  naver: '네이버 블로그/카페 스타일. 정보 중심. 키워드 최적화. 상세한 혜택 설명.',
  youtube: '영상 스크립트 톤. 후킹 인트로 + 혜택 소개 + CTA. 댓글 유도.',
  email: '비즈니스 커뮤니케이션 톤. 제목 + 프리뷰 + 본문 구조. 개인화 요소.',
  sms: '초간결. 50자 이내 핵심 메시지. 링크 CTA. 수신거부 안내.',
  kakao: '친근한 대화체. 카카오톡 메시지 형식. 이모지 활용. 버튼 CTA.',
};

const CHANNEL_LABELS: Record<string, string> = {
  instagram: '인스타그램',
  facebook: '페이스북',
  google: '구글 광고',
  naver: '네이버',
  youtube: '유튜브',
  email: '이메일',
  sms: 'SMS',
  kakao: '카카오톡',
};

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const {
    promotionName,
    promotionType,
    discountValue,
    target,
    goal,
    channelType,
    usp,
    ctaText,
  } = body;

  if (!promotionName || !channelType) {
    return NextResponse.json({ error: '필수 정보가 부족합니다.' }, { status: 400 });
  }

  const channelLabel = CHANNEL_LABELS[channelType] || channelType;
  const tone = CHANNEL_TONE[channelType] || '일반적인 마케팅 톤.';

  const systemPrompt = `당신은 ${channelLabel} 전문 마케팅 카피라이터입니다.
채널 특성에 맞는 프로모션 카피를 작성해주세요.

채널 톤 & 매너: ${tone}

작성 규칙:
- 한국어로 작성
- 3개 버전의 카피를 제공
- 각 버전마다 헤드라인, 본문, CTA를 구분
- 긴급성/희소성/혜택을 자연스럽게 강조
- 채널 특성에 맞는 길이와 형식 준수`;

  const userMessage = `프로모션 정보:
- 프로모션명: ${promotionName}
- 유형: ${promotionType}${discountValue ? ` (${discountValue})` : ''}
- 대상: ${target || '전체'}
- 목표: ${goal || '미정'}
${usp ? `- USP (핵심 메시지): ${usp}` : ''}
${ctaText ? `- 원하는 CTA: ${ctaText}` : ''}

${channelLabel} 채널에 최적화된 프로모션 카피 3개 버전을 작성해주세요.`;

  try {
    const apiKey = await getUserApiKey(userEmail);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다. Settings에서 API 키를 등록해주세요.' },
        { status: 400 }
      );
    }

    const result = await generateCompletion(apiKey, systemPrompt, userMessage);

    await logActivity(
      'promotion_channel_ai_generate',
      null,
      { promotion_name: promotionName, channel: channelType },
      userEmail
    );

    return NextResponse.json({ copy: result });
  } catch (err) {
    console.error('[ai-channel-copy] error:', err);
    return NextResponse.json({ error: 'AI 카피 생성에 실패했습니다.' }, { status: 500 });
  }
}
