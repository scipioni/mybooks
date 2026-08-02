import fs from "node:fs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { handleAuthError, requireUser } from "@/lib/authz";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = db.select().from(books).where(eq(books.id, id)).get();

    if (!book || book.ownerId !== user.id || !book.coverPath || !fs.existsSync(book.coverPath)) {
      return NextResponse.redirect(new URL("/placeholder-cover.svg", req.url));
    }

    const buffer = fs.readFileSync(book.coverPath);
    const ext = book.coverPath.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : "image/jpeg";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
