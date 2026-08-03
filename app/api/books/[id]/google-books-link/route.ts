import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, handleAuthError, requireUser } from "@/lib/authz";
import { getExternalBookLink } from "@/lib/externalBookLink";
import { resolveGoogleBooksLinkByIsbn } from "@/lib/googlebooks";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = db.select().from(books).where(eq(books.id, id)).get();
    if (!book) throw new NotFoundError("Book not found");
    if (book.ownerId !== user.id) throw new ForbiddenError("You do not own this book");

    const existingLink = getExternalBookLink(book);
    if (existingLink) {
      return NextResponse.json({ link: existingLink });
    }

    if (!book.isbn) {
      return NextResponse.json({ link: null });
    }

    const link = await resolveGoogleBooksLinkByIsbn(book.isbn);
    if (link) {
      db.update(books).set({ googleBooksLink: link }).where(eq(books.id, id)).run();
    }

    return NextResponse.json({ link });
  } catch (err) {
    return handleAuthError(err);
  }
}
