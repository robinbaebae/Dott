import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { EMAIL_SEQUENCE_PROMPT } from '@/lib/prompts';
import { getBrandGuideContext } from '@/lib/brand-guide';
import { createDraft } from '@/lib/gmail';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// GET — list sequences with items
export async function GET(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // Single sequence with items
      const { data: seq, error } = await supabaseAdmin
        .from('email_sequences')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: items } = await supabaseAdmin
        .from('email_sequence_items')
        .select('*')
        .eq('sequence_id', id)
        .order('position', { ascending: true });

      return NextResponse.json({ ...seq, items: items ?? [] });
    }

    const { data, error } = await supabaseAdmin
      .from('email_sequences')
      .select('*')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — generate email sequence via AI
export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { name, purpose, target_audience, email_count, key_messages } = await req.json();
    if (!name || !purpose) {
      return NextResponse.json({ error: 'name and purpose are required' }, { status: 400 });
    }

    const brandContext = await getBrandGuideContext(userEmail);
    const count = email_count || 3;
    const userMessage = `${brandContext ? brandContext + '\n\n' : ''}시퀀스 이름: "${name}"
목적: ${purpose}
타겟: ${target_audience || '미지정'}
이메일 수: ${count}개
핵심 메시지: ${key_messages?.length ? key_messages.join(', ') : '미지정'}

위 정보를 바탕으로 이메일 시퀀스를 설계해주세요.`;

    const raw = await withTimeout(
      generateCompletion(EMAIL_SEQUENCE_PROMPT, userMessage),
      90000,
      '이메일 시퀀스 생성 시간 초과'
    );

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    // Insert sequence
    const { data: seq, error: seqError } = await supabaseAdmin
      .from('email_sequences')
      .insert({
        name,
        purpose,
        target_audience: target_audience || '',
        key_messages: key_messages || [],
        strategy_explanation: parsed.strategy || '',
        email_count: count,
        status: 'completed',
        user_id: userEmail,
      })
      .select()
      .single();

    if (seqError) throw seqError;

    // Insert items
    const emails = parsed.emails || [];
    const items = emails.map((email: {
      day_offset?: number;
      subject?: string;
      body_html?: string;
      cta_text?: string;
      notes?: string;
    }, i: number) => ({
      sequence_id: seq.id,
      position: i,
      day_offset: email.day_offset ?? i * 2,
      subject: email.subject || '',
      body_html: email.body_html || '',
      cta_text: email.cta_text || '',
      notes: email.notes || '',
      status: 'draft',
      user_id: userEmail,
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('email_sequence_items')
        .insert(items);
      if (itemsError) throw itemsError;
    }

    // Fetch back with items
    const { data: itemsData } = await supabaseAdmin
      .from('email_sequence_items')
      .select('*')
      .eq('sequence_id', seq.id)
      .order('position', { ascending: true });

    await logActivity('email_sequence_generate', null, { name, purpose, email_count: count });
    return NextResponse.json({ ...seq, items: itemsData ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — update item or save to gmail
export async function PATCH(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const body = await req.json();
    const { action } = body;

    // Update individual email item
    if (action === 'update_item') {
      const { item_id, subject, body_html, cta_text, cta_url, notes } = body;
      if (!item_id) {
        return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), status: 'edited' };
      if (subject !== undefined) updates.subject = subject;
      if (body_html !== undefined) updates.body_html = body_html;
      if (cta_text !== undefined) updates.cta_text = cta_text;
      if (cta_url !== undefined) updates.cta_url = cta_url;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabaseAdmin
        .from('email_sequence_items')
        .update(updates)
        .eq('id', item_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Save to Gmail draft
    if (action === 'save_to_gmail') {
      const { item_id, to } = body;
      if (!item_id) {
        return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
      }

      const { data: item } = await supabaseAdmin
        .from('email_sequence_items')
        .select('*')
        .eq('id', item_id)
        .single();

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const result = await createDraft(to || '', item.subject, item.body_html, userEmail);
      if (!result) {
        return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
      }

      const { data, error } = await supabaseAdmin
        .from('email_sequence_items')
        .update({
          gmail_draft_id: result.draftId,
          gmail_message_id: result.messageId,
          status: 'gmail_saved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', item_id)
        .select()
        .single();

      if (error) throw error;

      await logActivity('email_sequence_gmail_save', null, { item_id, subject: item.subject });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete sequence (cascade deletes items)
export async function DELETE(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('email_sequences')
      .delete()
      .eq('id', id)
      .eq('user_id', userEmail);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
