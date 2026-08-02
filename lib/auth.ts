import { randomUUID } from "node:crypto";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    // Registration gate: only the configured admin email, an existing user,
    // or the holder of a matching redeemable invite may sign in. Everyone
    // else is rejected without creating a session or account (auth spec).
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      // Admin bootstrap: auto-provision on first login, sign in as-is after.
      if (env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase()) {
        const existingAdmin = db.select().from(users).where(eq(users.email, email)).get();
        if (!existingAdmin) {
          db.insert(users)
            .values({
              id: randomUUID(),
              email,
              name: user.name ?? null,
              role: "admin",
              createdAt: new Date(),
            })
            .run();
        }
        return true;
      }

      // Existing registered user (admin or previously-redeemed invitee).
      const existingUser = db.select().from(users).where(eq(users.email, email)).get();
      if (existingUser) return true;

      // Redeemable invite: exact email match, not yet redeemed.
      const invite = db
        .select()
        .from(invites)
        .where(and(eq(invites.email, email), isNull(invites.redeemedAt)))
        .get();
      if (invite) {
        db.insert(users)
          .values({
            id: randomUUID(),
            email,
            name: user.name ?? null,
            role: "user",
            createdAt: new Date(),
          })
          .run();
        db.update(invites).set({ redeemedAt: new Date() }).where(eq(invites.id, invite.id)).run();
        return true;
      }

      return false;
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = db.select().from(users).where(eq(users.email, token.email.toLowerCase())).get();
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as "admin" | "user") ?? "user";
      }
      return session;
    },
  },
});
