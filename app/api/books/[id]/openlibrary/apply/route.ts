import fs from "node:fs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { books, type Book } from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, handleAuthError, requireUser } from "@/lib/authz";
import { fetchOpenLibraryDetails } from "@/lib/openlibrary";
import { fetchGoogleBooksDetails } from "@/lib/googlebooks";
import { resolveStoragePath, saveCoverFile } from "@/lib/storage";
import { embedCoverInEpub } from "@/lib/epubCover";

const applySchema = z.object({ key: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = db.select().from(books).where(eq(books.id, id)).get();
    if (!book) throw new NotFoundError("Book not found");
    if (book.ownerId !== user.id) throw new ForbiddenError("You do not own this book");

    const body = await req.json().catch(() => null);
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A candidate key is required" }, { status: 400 });
    }

    // Server-side re-fetch of full details, on explicit user confirmation
    // only — never trust client-supplied metadata for what gets persisted.
    // The "google:" key prefix (set by searchGoogleBooks) routes to the
    // Google Books fallback source instead of Open Library.
    const details = parsed.data.key.startsWith("google:")
      ? await fetchGoogleBooksDetails(parsed.data.key)
      : await fetchOpenLibraryDetails(parsed.data.key);

    const update: Partial<Book> = { openLibraryId: details.key, updatedAt: new Date() };
    if (details.title) update.title = details.title;
    if (details.author) update.author = details.author;
    if (details.language) update.language = details.language;
    if (details.isbn) update.isbn = details.isbn;
    if (details.publicationYear) update.publicationYear = details.publicationYear;
    if (details.coverBuffer && details.coverExt) {
      update.coverPath = saveCoverFile(user.id, id, details.coverBuffer, details.coverExt);

      // Best-effort: also embed the new cover into the EPUB file itself, not
      // just the app's separate cover display. A malformed/unusual EPUB
      // structure shouldn't fail the whole metadata apply.
      try {
        const absFilePath = resolveStoragePath(book.filePath);
        const epubBuffer = fs.readFileSync(absFilePath);
        const updatedEpub = await embedCoverInEpub(epubBuffer, details.coverBuffer);
        fs.writeFileSync(absFilePath, updatedEpub);
      } catch (err) {
        console.error("Failed to embed cover into EPUB:", err);
      }
    }

    db.update(books).set(update).where(eq(books.id, id)).run();
    const updated = db.select().from(books).where(eq(books.id, id)).get();
    return NextResponse.json({ book: updated });
  } catch (err) {
    return handleAuthError(err);
  }
}
