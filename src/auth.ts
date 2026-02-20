import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { supabase } from '@/lib/supabase';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/gmail.readonly',
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

        // Auto-connect Google Calendar & Gmail by storing tokens in Supabase
        if (account.access_token && account.refresh_token) {
          await supabase.from('google_tokens').upsert({
            id: 'default',
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: (account.expires_at ?? 0) * 1000,
            updated_at: new Date().toISOString(),
          });
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
