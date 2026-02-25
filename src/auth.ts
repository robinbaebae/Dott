import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On initial sign-in, store tokens
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        console.log('[NextAuth] jwt callback - account received:', {
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at,
          provider: account.provider,
        });

        // Auto-connect Google Calendar & Gmail by storing tokens in Supabase
        if (account.access_token && token.email) {
          const payload: Record<string, unknown> = {
            id: token.email as string,
            user_id: token.email as string,
            access_token: account.access_token,
            expiry_date: (account.expires_at ?? 0) * 1000,
            updated_at: new Date().toISOString(),
          };
          // refresh_token may not always be present
          if (account.refresh_token) {
            payload.refresh_token = account.refresh_token;
          }

          const { error } = await supabaseAdmin.from('google_tokens').upsert(payload);
          if (error) {
            console.error('[NextAuth] Failed to store Google tokens in Supabase:', error);
          } else {
            console.log('[NextAuth] Google tokens stored successfully in Supabase');
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
      };
    },
  },
  pages: {
    signIn: '/login',
  },
});
