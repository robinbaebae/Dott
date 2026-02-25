import { NextRequest, NextResponse } from 'next/server';
import { checkTone } from '@/lib/tone-checker';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }

    const result = await checkTone(content, userEmail);
    if (!result) {
      return NextResponse.json({ error: 'Brand guide not configured' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tone check error:', error);
    return NextResponse.json({ error: 'Failed to check tone' }, { status: 500 });
  }
}
