import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Get the current user's email from the session.
 * Returns null if not authenticated.
 */
export async function getUserEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

/**
 * Require authentication. Returns the user email or a 401 response.
 * Usage in API routes:
 *   const userEmail = await requireAuth();
 *   if (userEmail instanceof NextResponse) return userEmail;
 */
export async function requireAuth(): Promise<string | NextResponse> {
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return email;
}
