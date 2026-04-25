import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL ?? "MediScan <no-reply@yourdomain.com>"
    })
  );
}

export const authConfig = {
  providers,
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        if (user?.id) {
          session.user.id = user.id;
        } else if (typeof token?.sub === "string") {
          session.user.id = token.sub;
        }

        if (user?.plan) {
          session.user.plan = user.plan;
        }
      }

      return session;
    }
  }
} satisfies NextAuthConfig;
