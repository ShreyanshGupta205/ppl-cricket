import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text'     },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const expectedUsername = process.env.ADMIN_USERNAME;
        const expectedPassword = process.env.ADMIN_PASSWORD;

        if (!expectedUsername || !expectedPassword) {
          console.error('[AUTH] ❌ ADMIN_USERNAME or ADMIN_PASSWORD not set in env');
          return null;
        }

        const usernameOk = credentials.username === expectedUsername;
        const passwordOk = credentials.password === expectedPassword;

        if (usernameOk && passwordOk) {
          console.log('[AUTH] ✅ Login success');
          return { id: '1', name: 'PPL Admin', email: 'admin@ppl.com' };
        }

        console.log('[AUTH] ❌ Wrong username or password');
        return null;
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: '/admin/login',
  },

  secret: process.env.NEXTAUTH_SECRET,

  // trustHost is next-auth v5 only — v4 uses NEXTAUTH_URL env var instead
  // Make sure NEXTAUTH_URL=https://ppl-cricket.vercel.app is set in Vercel

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = 'admin';
      return token;
    },
    async session({ session, token }) {
      (session as any).role = token.role;
      return session;
    },
  },
};