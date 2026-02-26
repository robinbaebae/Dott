import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { name, type, discount_value, target, start_date, end_date, goal, description } = body;

  if (!name) {
    return NextResponse.json({ error: '프로모션명을 입력해주세요.' }, { status: 400 });
  }

  const systemPrompt = `당신은 마케팅 프로모션 카피라이터입니다. 주어진 프로모션 정보를 바탕으로 다양한 채널(SNS, 이메일, 배너, 푸시알림)에 사용할 수 있는 매력적인 프로모션 카피를 작성해주세요.

작성 규칙:
- 한국어로 작성
- 각 채널별 톤과 길이에 맞게 작성
- 긴급성/희소성/혜택을 강조
- 이모지 적절히 활용
- CTA(Call to Action) 포함`;

  const userMessage = `프로모션 정보:
- 프로모션명: ${name}
- 유형: ${type}${discount_value ? ` (${discount_value})` : ''}
- 대상: ${target}
- 기간: ${start_date || '미정'} ~ ${end_date || '미정'}
- 목표: ${goal || '미정'}
- 설명: ${description || '없음'}

다음 형식으로 카피를 작성해주세요:

## SNS 포스트 (인스타그램/페이스북)
(2-3개 버전)

## 이메일 제목 + 본문 미리보기
(2개 버전)

## 배너 카피 (헤드라인 + 서브카피)
(2개 버전)

## 푸시 알림
(2개 버전)

## 해시태그 추천
(5-10개)`;

  try {
    const apiKey = await getUserApiKey(userEmail);
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다. Settings에서 API 키를 등록해주세요.' }, { status: 400 });
    }

    const result = await generateCompletion(apiKey, systemPrompt, userMessage);

    await logActivity('promotion_ai_generate', null, { promotion_name: name }, userEmail);

    return NextResponse.json({ copy: result });
  } catch (err) {
    console.error('[promotion/generate] error:', err);
    return NextResponse.json({ error: 'AI 카피 생성에 실패했습니다.' }, { status: 500 });
  }
}
