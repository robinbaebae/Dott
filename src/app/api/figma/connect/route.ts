import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isFigmaConnected, validateToken } from '@/lib/figma';

export async function GET() {
  try {
    const connected = await isFigmaConnected();
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const { valid, userName } = await validateToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid Figma token' }, { status: 401 });
    }

    const { error } = await supabase.from('figma_tokens').upsert({
      id: 'default',
      personal_access_token: token,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connected: true, userName });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase
      .from('figma_tokens')
      .delete()
      .eq('id', 'default');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connected: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
