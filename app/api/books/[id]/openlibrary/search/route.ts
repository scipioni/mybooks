import { NextResponse } from "next/server";
import { handleAuthError, requireUser } from "@/lib/authz";
import { getBookOrThrow } from "@/lib/books";
import { searchOpenLibrary, searchOpenLibraryByIsbn } from "@/lib/openlibrary";
import { searchGoogleBooks } from "@/lib/googlebooks";
import type { OpenLibraryCandidate } from "@/lib/openlibrary";

interface SourceResult {
  candidates: OpenLibraryCandidate[];
  failed: boolean;
}

// Google Books is queried first (better coverage of translated/non-English
// editions in practice), Open Library second — but Open Library returning
// *some* results doesn't mean Google's are unnecessary, since free-text
// search on either side can be fuzzy/irrelevant for a title it doesn't
// actually have (see e.g. "Il giorno della tigre", which OL returns unrelated
// matches for rather than zero). So both sources are queried unconditionally
// and merged, Google's results first, rather than only trying one as a
// fallback when the other comes back completely empty. Each call is isolated
// so one source's failure (e.g. a rate limit) doesn't drop the other's
// results — but the failure itself is reported back too, so a Google outage
// doesn't silently look identical to "Google genuinely has no match."
async function tryGoogleBooks(query: string, language?: string): Promise<SourceResult> {
  try {
    return { candidates: await searchGoogleBooks(query, language), failed: false };
  } catch {
    return { candidates: [], failed: true };
  }
}

async function tryOpenLibraryFallback(query: string, language?: string): Promise<SourceResult> {
  try {
    return { candidates: await searchOpenLibrary(query, language), failed: false };
  } catch {
    return { candidates: [], failed: true };
  }
}

// Scopes a plain title query to Google Books' documented `intitle:` field
// keyword for more precise matching (fewer irrelevant hits than an unscoped
// free-text query). Only applied to Google's copy of the query — Open
// Library's own query text is untouched. Skipped if the query already uses a
// keyword operator (e.g. a user-typed "isbn:..." or "intitle:..." query),
// since wrapping that would break it.
function scopeToTitle(query: string): string {
  if (/\b(?:isbn|intitle|inauthor|inpublisher|subject|lccn|oclc):/i.test(query)) return query;
  return `intitle:"${query}"`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);

    const { searchParams } = new URL(req.url);
    const isbn = searchParams.get("isbn")?.trim();
    if (isbn) {
      // ISBN identifies an exact edition regardless of language — reliable
      // for translated titles that free-text search won't match.
      const google = await tryGoogleBooks(`isbn:${isbn}`);
      if (google.candidates.length > 0) {
        return NextResponse.json({ candidates: google.candidates, sourceErrors: { google: google.failed } });
      }
      const candidates = await searchOpenLibraryByIsbn(isbn);
      return NextResponse.json({ candidates, sourceErrors: { google: google.failed, openLibrary: false } });
    }

    const customQuery = searchParams.get("q")?.trim();
    // Title-only default: combining title + author in one free-text query
    // often produces zero hits when the author field is messy (multi-author
    // mashups, "Lastname, Firstname" artifacts from source metadata).
    const query = customQuery || (book.title ?? "").trim();

    if (!query) {
      return NextResponse.json({ candidates: [] });
    }

    const language = searchParams.get("language")?.trim() || undefined;
    const [google, openLibrary] = await Promise.all([
      tryGoogleBooks(scopeToTitle(query), language),
      tryOpenLibraryFallback(query, language),
    ]);
    return NextResponse.json({
      candidates: [...google.candidates, ...openLibrary.candidates],
      sourceErrors: { google: google.failed, openLibrary: openLibrary.failed },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
