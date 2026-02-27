import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GUEST_USER_ID = 'guest@local';

/**
 * Get the current user's email from the session.
 * Falls back to guest identity if guest cookie is set.
 * Returns null if neither authenticated nor guest.
 */
export async function getUserEmail(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.email) return session.user.email;

  // Guest mode fallback
  const cookieStore = await cookies();
  if (cookieStore.get('dott-guest')?.value === 'true') {
    return GUEST_USER_ID;
  }

  return null;
}

/**
 * Require authentication. Returns the user email or a 401 response.
 * Guest users get the identifier 'guest@local'.
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

export { GUEST_USER_ID };
