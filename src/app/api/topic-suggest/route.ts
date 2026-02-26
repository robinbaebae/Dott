import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { TOPIC_SUGGEST_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);


  const { keyword, contentType } = await req.json();
  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 });
  }

  try {
    const userMessage = `키워드: ${keyword}
콘텐츠 타입: ${contentType || 'blog'}

위 키워드에 대한 콘텐츠 소재 제목 10개를 추천해주세요.`;

    const raw = await generateCompletion(apiKey, TOPIC_SUGGEST_PROMPT, userMessage);

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 });
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    await logActivity('topic_suggest', 'marketing', { keyword, contentType });
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Topic suggest error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
