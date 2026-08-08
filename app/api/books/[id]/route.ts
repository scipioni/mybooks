import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { books, type Book } from "@/lib/db/schema";
import { ForbiddenError, handleAuthError, requireUser } from "@/lib/authz";
import { getBookOrThrow } from "@/lib/books";
import { deleteBookFiles } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);
    return NextResponse.json({ book });
  } catch (err) {
    return handleAuthError(err);
  }
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().nullable().optional(),
  seriesName: z.string().nullable().optional(),
  seriesPosition: z.number().int().nullable().optional(),
  tags: z.array(z.string()).optional(),
  readingStatus: z.enum(["want-to-read", "reading", "read"]).optional(),
  rating: z.number().int().min(0).max(5).nullable().optional(),
  language: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  publicationYear: z.number().int().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    getBookOrThrow(id);

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { tags, ...rest } = parsed.data;
    const update: Partial<Book> = { ...rest, updatedAt: new Date() };
    if (tags) update.tags = JSON.stringify(tags);

    db.update(books).set(update).where(eq(books.id, id)).run();
    const updated = db.select().from(books).where(eq(books.id, id)).get();
    return NextResponse.json({ book: updated });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);
    // Deletion is the one destructive, irreversible action on a shared book —
    // it removes the file for everyone — so it stays restricted to the user
    // who uploaded it, unlike viewing and editing.
    if (book.ownerId !== user.id) {
      throw new ForbiddenError("Only the user who uploaded this book can delete it");
    }

    db.delete(books).where(eq(books.id, id)).run();
    deleteBookFiles(book.filePath, book.coverPath);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}
