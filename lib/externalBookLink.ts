import type { Book } from "@/lib/db/schema";

const GOOGLE_KEY_PREFIX = "google:";

/**
 * Pure read of a book's external listing link — never resolves or makes a
 * network call. `openLibraryId` is set by the confirmed-metadata apply flow
 * for either source: a real Open Library key (e.g. "/books/OL123456M") or,
 * when the confirmed candidate came from Google Books, a "google:<volumeId>"
 * string (see openlibrary/apply/route.ts) — both resolve to a link for free.
 * Only when neither is set do we fall back to a cached ISBN-based lookup.
 */
export function getExternalBookLink(book: Pick<Book, "openLibraryId" | "googleBooksLink">): string | null {
  if (book.openLibraryId?.startsWith(GOOGLE_KEY_PREFIX)) {
    const volumeId = book.openLibraryId.slice(GOOGLE_KEY_PREFIX.length);
    return `https://books.google.com/books?id=${encodeURIComponent(volumeId)}`;
  }
  if (book.openLibraryId) return `https://openlibrary.org${book.openLibraryId}`;
  return book.googleBooksLink ?? null;
}
