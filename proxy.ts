import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Defense-in-depth route guard for admin-only areas, running on the Edge
// runtime. Uses only the edge-safe config (decodes the existing session JWT
// and applies the `authorized` callback) — no DB access here. Every admin
// API route and server component also re-checks the role server-side via
// lib/authz.ts's requireAdmin, so this middleware is not the sole
// enforcement point.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/api/invites/:path*"],
};
