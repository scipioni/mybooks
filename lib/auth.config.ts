import type { NextAuthConfig } from "next-auth";
import { env } from "@/lib/env";

/**
 * Edge-safe subset of the NextAuth config: no providers or DB-backed
 * callbacks here, so this can be imported by middleware.ts (which runs on
 * the Edge runtime and cannot load better-sqlite3). The full config with
 * Google provider + DB callbacks lives in lib/auth.ts and is used by
 * everything else (route handlers, server components).
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/signin",
    error: "/denied",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Pure token->session field mapping (no DB access), so it's safe to run
    // on the Edge. Without this, middleware's `auth.user.role` below would
    // always be undefined — the role only ends up in the JWT via auth.ts's
    // DB-backed `jwt` callback, but reading it back out into `session.user`
    // still requires a `session` callback, which auth.ts also defines but
    // middleware never sees since it only uses this edge-safe config.
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as "admin" | "user") ?? "user";
      }
      return session;
    },
    authorized({ auth, request }) {
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
      if (!isAdminRoute) return true;
      return auth?.user?.role === "admin";
    },
  },
};
