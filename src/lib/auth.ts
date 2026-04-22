import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateReferralCode } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // ─── Google OAuth ───────────────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),

    // ─── Credentials ────────────────────────────────────────────────────────
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;
          if (user.isBlocked) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
            role: user.role,
          } as any;
        } catch (err) {
          console.error("[Auth authorize error]", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    // ─── Handle Google sign-in: create/link user in DB ──────────────────────
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Create new user from Google
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name ?? user.email!,
                googleId: account.providerAccountId,
                referralCode: generateReferralCode(),
                role: "USER",
                password: "", // No password for Google users
              },
            });
          } else if (!existingUser.googleId) {
            // Link Google account to existing user
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { googleId: account.providerAccountId },
            });
          }

          if (existingUser?.isBlocked) return false;
        } catch (err) {
          console.error("[Google signIn error]", err);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      // For Google logins, fetch user from DB to get id and role
      if (account?.provider === "google" && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, isBlocked: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch {}
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
