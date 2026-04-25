import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { Session, User } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: requiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET")
    }),
    Resend({
      apiKey: requiredEnv("RESEND_API_KEY"),
      from: process.env.RESEND_FROM_EMAIL ?? "MediScan <no-reply@yourdomain.com>"
    })
  ],
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, user }: { session: Session; user: User }) {
      if (session.user && user.id) {
        session.user.id = user.id;
        session.user.plan = user.plan;
      }
      return session;
    }
  }
});

