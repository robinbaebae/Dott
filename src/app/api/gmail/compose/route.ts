import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { createDraft } from '@/lib/gmail';
import { EMAIL_COMPOSE_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';
import { getBrandGuideContext } from '@/lib/brand-guide';

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const brandContext = await getBrandGuideContext(userEmail);

    const { action, to, topic, details, tone, subject, bodyHtml } = await req.json();

    if (action === 'generate') {
      if (!to || !topic) {
        return NextResponse.json({ error: 'to and topic are required' }, { status: 400 });
      }

      const userMessage = `${brandContext ? brandContext + '\n\n' : ''}받는 사람: ${to}
목적/주제: ${topic}
${details ? `상세 내용: ${details}` : ''}
톤: ${tone || 'professional'}

위 정보를 바탕으로 이메일을 작성해주세요.`;

      const raw = await withTimeout(
        generateCompletion(EMAIL_COMPOSE_PROMPT, userMessage),
        45000,
        '이메일 생성 시간 초과'
      );

      // Extract JSON from response
      let parsed: { subject: string; body: string };
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }

      // Save locally
      const { data, error } = await supabaseAdmin
        .from('email_drafts')
        .insert({
          to_email: to,
          subject: parsed.subject,
          body_html: parsed.body,
          status: 'local',
          user_id: userEmail,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logActivity('email_send', 'marketing', { to, topic });
      return NextResponse.json(data);
    }

    if (action === 'draft') {
      if (!to || !subject || !bodyHtml) {
        return NextResponse.json({ error: 'to, subject, and bodyHtml are required' }, { status: 400 });
      }

      const result = await createDraft(to, subject, bodyHtml, userEmail);
      if (!result) {
        return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
      }

      // Update local record if we have an id
      const { draftId, messageId } = result;

      const { data, error } = await supabaseAdmin
        .from('email_drafts')
        .upsert({
          to_email: to,
          subject,
          body_html: bodyHtml,
          gmail_draft_id: draftId,
          gmail_message_id: messageId,
          status: 'drafted',
          user_id: userEmail,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
