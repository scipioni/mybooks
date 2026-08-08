import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { books, type Book } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/authz";

/**
 * The library is shared across the instance: every signed-in user may view and
 * edit every book, whoever uploaded it. `ownerId` is kept only to record who
 * imported a book and to key its files on disk — it is not an access boundary.
 * Devices and reviews stay per-user.
 */
export function getBookOrThrow(id: string): Book {
  const book = db.select().from(books).where(eq(books.id, id)).get();
  if (!book) throw new NotFoundError("Book not found");
  return book;
}
