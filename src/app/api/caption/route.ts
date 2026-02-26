import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { CAPTION_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';
import { getBrandGuideContext } from '@/lib/brand-guide';

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);


  const brandContext = await getBrandGuideContext(userEmail);

  const { platform, topic, tone } = await req.json();
  if (!platform || !topic) {
    return NextResponse.json({ error: 'platform and topic required' }, { status: 400 });
  }

  try {
    const userMessage = `${brandContext ? brandContext + '\n\n' : ''}플랫폼: ${platform}
주제: ${topic}
톤: ${tone || 'casual'}

위 정보를 바탕으로 캡션을 작성해주세요.`;

    const result = await generateCompletion(apiKey, CAPTION_GENERATION_PROMPT, userMessage);

    await logActivity('caption_generate', 'marketing', { platform, topic, tone });
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Caption generation error:', error);
    return NextResponse.json({ error: 'Failed to generate caption' }, { status: 500 });
  }
}
