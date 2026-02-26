import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

const SYSTEM_PROMPT = `You are an expert digital advertising analyst for a Korean marketing team.
You have access to campaign performance data and should answer questions about it.

Guidelines:
- Always reference specific numbers from the provided data
- Write in Korean
- Be concise and actionable
- Use markdown formatting (##, bullet points)
- IMPORTANT: Use markdown tables (| header1 | header2 |) to compare creatives, campaigns, or metrics side-by-side for better readability
- If asked about optimization, provide concrete budget/targeting recommendations
- Compare creatives and campaigns using CTR, ROAS, CPC metrics in table format`;

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;
    const apiKey = await getUserApiKey(userEmail);


    const { question, context, platform } = await req.json();

    if (!question || !context) {
      return NextResponse.json({ error: 'question and context required' }, { status: 400 });
    }

    const userMessage = `Platform: ${platform === 'google' ? 'Google Ads' : 'Meta Ads'}

Ad Performance Data:
${context}

Question: ${question}`;

    const answer = await generateCompletion(apiKey, SYSTEM_PROMPT, userMessage);

    await logActivity('ad_query', null, {
      platform,
      question: question.slice(0, 100),
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Ad query error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
