import { NextRequest, NextResponse } from 'next/server';
import { getCompetitors, addCompetitor, deleteCompetitor } from '@/lib/competitors';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const competitors = await getCompetitors(userEmail);
    return NextResponse.json(competitors);
  } catch (error) {
    console.error('GET /api/competitors error:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const competitor = await addCompetitor(body, userEmail);
    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('POST /api/competitors error:', error);
    return NextResponse.json({ error: 'Failed to add competitor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await deleteCompetitor(id, userEmail);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/competitors error:', error);
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
  }
}
