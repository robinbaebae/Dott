import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';

const AD_COPYWRITER_PROMPT = `You are an expert advertising copywriter. Given an ad copy or product description, generate 3-5 creative variations.

Return ONLY a valid JSON array. Each element must have:
- "headline": a short punchy headline (max 10 words)
- "body": the ad body copy (1-2 sentences)
- "tone": one of "professional", "playful", "urgent", "emotional", "minimal"

Example output:
[
  {"headline": "Transform Your Morning Routine", "body": "Start every day with energy. Our product makes it effortless.", "tone": "professional"},
  {"headline": "Wake Up. Show Up. Glow Up.", "body": "Because you deserve mornings that feel as good as you look.", "tone": "playful"}
]

Return ONLY the JSON array, no markdown, no explanation.`;

export async function POST(req: NextRequest) {
  const { copy } = await req.json();
  if (!copy || typeof copy !== 'string') {
    return NextResponse.json({ error: 'copy required' }, { status: 400 });
  }

  try {
    const result = await generateCompletion(AD_COPYWRITER_PROMPT, copy);

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
