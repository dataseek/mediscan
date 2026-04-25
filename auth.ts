import NextAuth, { type NextAuthConfig } from "next-auth";
import { authConfig } from "@/auth.config";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const useDatabaseSessions = hasDatabase && process.env.NODE_ENV === "production";
const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  process.env.OPENROUTER_API_KEY?.slice(0, 32);

const nextAuthOptions: NextAuthConfig = {
  ...authConfig,
  ...(secret ? { secret } : {}),
  session: { strategy: "jwt" as const }
};

if (useDatabaseSessions) {
  const { PrismaAdapter } = require("@auth/prisma-adapter") as typeof import("@auth/prisma-adapter");
  const { db } = require("./lib/db") as typeof import("./lib/db");

  nextAuthOptions.adapter = PrismaAdapter(db);
  nextAuthOptions.session = { strategy: "database" as const };
}

export const { handlers, auth, signIn, signOut } = NextAuth(nextAuthOptions);

