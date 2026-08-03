import fs from "node:fs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { resolveStoragePath } from "@/lib/storage";

/**
 * Unauthenticated cover endpoint for the logged-out landing page. Only ever
 * serves covers for books owned by the admin account (env.ADMIN_EMAIL) —
 * never any other user's private library — so it's safe to expose without
 * a session.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = env.ADMIN_EMAIL
    ? db.select().from(users).where(eq(users.email, env.ADMIN_EMAIL.toLowerCase())).get()
    : null;
  const book = admin ? db.select().from(books).where(eq(books.id, id)).get() : null;
  const absCoverPath = book?.coverPath ? resolveStoragePath(book.coverPath) : null;

  if (!admin || !book || book.ownerId !== admin.id || !absCoverPath || !fs.existsSync(absCoverPath)) {
    return NextResponse.redirect(new URL("/placeholder-cover.svg", req.url));
  }

  const buffer = fs.readFileSync(absCoverPath);
  const ext = absCoverPath.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
