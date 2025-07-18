import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log('[NextAuth] signIn callback', { user, account });
      if (account?.provider === 'google' && user.email) {
        try {
          // TODO: Re-enable whitelist after testing
          // Check if email is whitelisted
          // const whitelistedEmail = await prisma.whitelistedEmail.findFirst({ ... });
          // if (!whitelistedEmail) { ... }

          // Check if user exists in our database, if not create them
          const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
          console.log('[NextAuth] existingUser', existingUser);
          if (!existingUser) {
            // Prisma expects role to be of type UserRole enum, not string
            let defaultRole: 'AGENT' | 'ADMIN' | 'MANAGER' | 'TEAM_LEADER' = 'AGENT';
            if (user.email?.includes('admin')) defaultRole = 'ADMIN';
            else if (user.email?.includes('manager')) defaultRole = 'MANAGER';
            else if (user.email?.includes('lead') || user.email?.includes('supervisor')) defaultRole = 'TEAM_LEADER';
            const createdUser = await prisma.user.create({
              data: {
                email: user.email,
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                role: defaultRole,
                avatar: user.image,
                department: 'Customer Service',
              }
            });
            console.log('[NextAuth] createdUser', createdUser);
          }
        } catch (error) {
          console.error('[NextAuth] Error during sign in:', error);
          return false;
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth] redirect callback', { url, baseUrl });
      
      // If user is signing out (url is baseUrl or baseUrl/), redirect to login
      if (url === baseUrl || url === baseUrl + '/') {
        return baseUrl + '/login';
      }
      
      // If coming from login page after successful sign-in, redirect to team overview
      if (url === baseUrl + '/login') {
        return baseUrl + '/team-overview';
      }
      
      // If it's a relative URL, prepend baseUrl
      if (url.startsWith("/")) {
        // Don't redirect to team-overview if the user is trying to access login
        if (url === '/login') {
          return baseUrl + '/login';
        }
        return `${baseUrl}${url}`;
      }
      
      // If it's an absolute URL with the same origin, allow it
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      // Default fallback to team overview for authenticated users
      return baseUrl + '/team-overview';
    },
    async jwt({ token, user }) {
      console.log('[NextAuth] jwt callback', { token, user });
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        console.log('[NextAuth] dbUser in jwt', dbUser);
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.department = dbUser.department;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth] session callback', { session, token });
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
  events: {
    async signOut() {
      console.log('[NextAuth] signOut event triggered');
    },
  },
  session: {
    strategy: 'jwt', // Use JWT instead of database sessions
  },
}
