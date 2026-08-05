import fs from "node:fs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { handleAuthError, requireUser } from "@/lib/authz";
import { getOrCreateCoverThumbnail, resolveStoragePath } from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = db.select().from(books).where(eq(books.id, id)).get();
    const absCoverPath = book?.coverPath ? resolveStoragePath(book.coverPath) : null;

    if (!book || book.ownerId !== user.id || !absCoverPath || !fs.existsSync(absCoverPath)) {
      return NextResponse.redirect(new URL("/placeholder-cover.svg", req.url));
    }

    const wantsThumbnail = new URL(req.url).searchParams.get("size") === "thumb";
    const servedPath = wantsThumbnail ? await getOrCreateCoverThumbnail(absCoverPath) : absCoverPath;

    const buffer = fs.readFileSync(servedPath);
    const ext = servedPath.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : "image/jpeg";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
