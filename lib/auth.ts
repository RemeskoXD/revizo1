import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { getNextAuthJwtSecret } from "./jwt-secret";
import { isRevisionAuthExpired } from "./revision-auth-core";
import { findUserForAuthSession } from "./prisma-subscription-column";

const isSandboxEnv = process.env.APP_URL && (
  process.env.APP_URL.includes("europe-west3.run.app") || 
  process.env.APP_URL.includes("ais-")
);
if (isSandboxEnv) {
  process.env.NEXTAUTH_URL = process.env.APP_URL;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Heslo", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Neplatné přihlašovací údaje");
        }

        type UserAuth = {
          id: string;
          email: string | null;
          name: string | null;
          password: string | null;
          role: string;
          // Optional, until DB is migrated. When selected, it will be present.
          isDeleted?: boolean;
        };

        // Important: some DBs may still not have `User.isDeleted` column yet.
        // We try to select it first, and fall back to a query without it to keep login working.
        let user: UserAuth | null = null;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              isDeleted: true,
              accountStatus: true,
            },
          });
        } catch {
          user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              isDeleted: true,
            },
          });
        }

        if (!user || !user.password) {
          throw new Error("Uživatel nenalezen");
        }

        const isDeleted = (user as any)?.isDeleted === true;
        if (isDeleted) {
          throw new Error("Účet byl deaktivován");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Nesprávné heslo");
        }

        const acc = (user as { accountStatus?: string }).accountStatus;
        if (acc === "REJECTED") {
          throw new Error("Registrace nebyla schválena. Pro více informací kontaktujte podporu.");
        }

        const isPending = acc === "PENDING_APPROVAL" || user.role === 'PENDING_SUPPORT' || user.role === 'PENDING_CONTRACTOR';

        try {
          const statusRow = await prisma.user.findUnique({
            where: { id: user.id },
            select: { bannedAt: true, revisionAuthValidUntil: true, role: true },
          });
          if (statusRow?.bannedAt) {
            throw new Error("Účet byl zablokován. Kontaktujte podporu.");
          }
          if (
            statusRow &&
            !isPending &&
            isRevisionAuthExpired(statusRow.role, statusRow.revisionAuthValidUntil)
          ) {
            throw new Error(
              "Platnost oprávnění k revizím vypršela. Kontaktujte administrátora."
            );
          }
        } catch (e) {
          if (
            e instanceof Error &&
            (e.message.includes("zablokován") || e.message.includes("vypršela"))
          ) {
            throw e;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accountStatus: acc,
          pendingApproval: isPending,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountStatus = user.accountStatus;
        token.pendingApproval = user.pendingApproval;
      }
      return token;
    },
    async session({ session, token }) {
      const sub = token.sub ?? token.id;
      if (session.user && typeof sub === "string") {
        try {
          const row = await findUserForAuthSession(sub);
          if (!row || row.bannedAt) {
            session.user.id = (row?.id ?? sub) as string;
            session.user.role = (row?.role ?? token.role) as string;
            session.user.blocked = true;
            return session;
          }
          session.user.id = row.id;
          session.user.role = row.role;
          session.user.name = row.name;
          session.user.email = row.email ?? "";
          session.user.blocked = false;
          session.user.accountStatus = row.accountStatus;
          session.user.pendingApproval = row.accountStatus === "PENDING_APPROVAL" || row.role === 'PENDING_SUPPORT' || row.role === 'PENDING_CONTRACTOR';
          if (isRevisionAuthExpired(row.role, row.revisionAuthValidUntil) && !session.user.pendingApproval) {
            session.user.revisionAuthExpired = true;
            session.user.requiresSubscriptionCheckout =
              row.requiresSubscriptionCheckout === true;
            return session;
          }
          session.user.revisionAuthExpired = false;
          session.user.requiresSubscriptionCheckout =
            row.requiresSubscriptionCheckout === true;
        } catch {
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.accountStatus = token.accountStatus;
          session.user.pendingApproval = token.pendingApproval;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_URL?.startsWith("https://") ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: process.env.NEXTAUTH_URL?.startsWith("https://") ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: process.env.NEXTAUTH_URL?.startsWith("https://") ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },
  secret: getNextAuthJwtSecret(),
};
