import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';
import { REPURPOSE_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';
import { getBrandGuideContext } from '@/lib/brand-guide';

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const brandContext = await getBrandGuideContext(userEmail);

    const { content, sourceFormat, targetFormats } = await req.json();

    if (!content || !sourceFormat || !targetFormats?.length) {
      return NextResponse.json(
        { error: 'content, sourceFormat, and targetFormats are required' },
        { status: 400 }
      );
    }

    const userMessage = `${brandContext ? brandContext + '\n\n' : ''}원본 플랫폼: ${sourceFormat}
타겟 플랫폼: ${targetFormats.join(', ')}

원본 콘텐츠:
${content}

위 콘텐츠를 각 타겟 플랫폼에 맞게 변환해주세요.`;

    const result = await withTimeout(
      generateCompletion(REPURPOSE_PROMPT, userMessage),
      60000,
      '콘텐츠 변환 시간 초과'
    );

    // Parse JSON from the result
    let parsed;
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      parsed = targetFormats.map((platform: string) => ({
        platform,
        content: result,
      }));
    }

    await logActivity('content_create', 'marketing', { sourceFormat, targetFormats });
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Repurpose error:', error);
    return NextResponse.json(
      { error: 'Failed to repurpose content' },
      { status: 500 }
    );
  }
}
