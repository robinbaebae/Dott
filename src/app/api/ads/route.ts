import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { requireAuth } from '@/lib/auth-guard';
import { getBrandGuideContext } from '@/lib/brand-guide';

function buildPrompt(opts: { tone?: string; maxLength?: number; useEmoji?: boolean; count?: number; referenceCopy?: string }) {
  const { tone, maxLength, useEmoji, count = 5, referenceCopy } = opts;

  let prompt = `You are an expert advertising copywriter. Given an ad copy or product description, generate ${count} creative variations.

Return ONLY a valid JSON array. Each element must have:
- "headline": a short punchy headline (max 10 words)
- "body": the ad body copy (1-2 sentences)
- "tone": the tone used for this variation`;

  if (tone) {
    prompt += `\n\nPrimary tone to use: "${tone}". Create variations within this tone but with different angles.`;
  } else {
    prompt += `\n\nUse a mix of tones: professional, playful, urgent, emotional, minimal.`;
  }

  if (maxLength) {
    prompt += `\nIMPORTANT: Each body copy must be ${maxLength} characters or less.`;
  }

  if (useEmoji) {
    prompt += `\nInclude relevant emojis in both headline and body to make them more engaging.`;
  }

  if (referenceCopy) {
    prompt += `\n\nReference copy to draw inspiration from (maintain similar style but create original variations):\n"${referenceCopy}"`;
  }

  prompt += `\n\nReturn ONLY the JSON array, no markdown, no explanation.`;
  return prompt;
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);


  const brandContext = await getBrandGuideContext(userEmail);

  const { copy, tone, maxLength, useEmoji, count, referenceCopy } = await req.json();
  if (!copy || typeof copy !== 'string') {
    return NextResponse.json({ error: 'copy required' }, { status: 400 });
  }

  try {
    const prompt = buildPrompt({ tone, maxLength, useEmoji, count, referenceCopy });
    const copyWithContext = `${brandContext ? brandContext + '\n\n' : ''}${copy}`;
    const result = await generateCompletion(apiKey, prompt, copyWithContext);

    // Extract JSON array from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse variations' }, { status: 500 });
    }

    const variations = JSON.parse(jsonMatch[0]);
    return NextResponse.json(variations);
  } catch (error) {
    console.error('Ad generation error:', error);
    return NextResponse.json({ error: 'Failed to generate ad variations' }, { status: 500 });
  }
}
