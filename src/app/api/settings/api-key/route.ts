import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { data } = await supabaseAdmin
      .from('user_settings')
      .select('anthropic_api_key')
      .eq('user_id', userEmail)
      .single();

    return NextResponse.json({
      hasKey: !!data?.anthropic_api_key,
      // Return masked key for display (show last 8 chars)
      maskedKey: data?.anthropic_api_key
        ? '••••••••' + data.anthropic_api_key.slice(-8)
        : null,
    });
  } catch {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }
}

export async function POST(request: Request) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json(
        { error: 'Invalid API key format. Key should start with sk-ant-' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('user_settings').upsert({
      user_id: userEmail,
      anthropic_api_key: apiKey,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save API key error:', error);
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
}
