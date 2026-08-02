import type { Book } from "@/lib/db/schema";

/**
 * A book is "incomplete" if it's missing any field commonly filled in by
 * the Open Library / Google Books metadata lookup — author, a real cover
 * (not the placeholder), language, ISBN, or publication year. Used to flag
 * candidates for review on the dashboard and to drive the "incomplete only"
 * filter.
 */
export function isMetadataIncomplete(book: Pick<Book, "author" | "coverPath" | "language" | "isbn" | "publicationYear">): boolean {
  return !book.author || !book.coverPath || !book.language || !book.isbn || !book.publicationYear;
}
