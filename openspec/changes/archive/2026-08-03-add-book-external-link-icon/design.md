## Context

`lib/googlebooks.ts` already talks to the Google Books API (`searchGoogleBooks`, `fetchGoogleBooksDetails`) but only as a metadata fallback when Open Library has no match; the API's `canonicalVolumeLink`/`infoLink` fields are never read. `openLibraryId` (`lib/db/schema.ts`) is already stored as a path like `/books/OL123456M` when a user confirms an Open Library candidate (`app/api/books/[id]/openlibrary/apply/route.ts`). See proposal.md for why this link is being surfaced now.

## Goals / Non-Goals

**Goals:**
- Resolve a working external listing link for as many books as possible, at minimal added API cost.
- Never repeat a Google Books lookup for a book once resolved.
- Keep the icon absent (not a broken link) when no link can be resolved.

**Non-Goals:**
- Backfilling every existing book's link upfront — resolution for pre-existing books happens lazily on first click.
- Adding the icon to the logged-out landing grid (`LandingGrid.tsx`) — library grid only, per proposal.
- Changing the Open Library/Google Books metadata *candidate search* flow (`open-library-metadata` capability) — this only adds a link resolution step alongside it.

## Decisions

**Schema: add `googleBooksLink: text("google_books_link")` (nullable) to `books`.**
Storing the resolved URL directly (rather than just a volume id) avoids re-deriving or re-normalizing anything at read time — the value written is exactly the value rendered. Alternative considered: store only `googleBooksId` and construct `https://books.google.com/books?id=...` on read. Rejected because Google's own `canonicalVolumeLink` already includes locale/query params tuned by Google (as in the example URL) and is more likely to stay valid than a hand-built URL.

**No column needed for Open Library links.** `openLibraryId` already exists and is sufficient to construct `https://openlibrary.org{openLibraryId}` at render time — no caching needed since there's no network call to save.

**Resolution priority is Open Library first, checked before touching `googleBooksLink` at all.** Matches proposal priority; also means a book that already has both an `openLibraryId` and a stale/absent `googleBooksLink` never triggers a needless Google lookup.

**New helper `resolveGoogleBooksLinkByIsbn(isbn)` in `lib/googlebooks.ts`.** Queries `GOOGLE_BOOKS_API` with `q=isbn:{isbn}` (exact-edition query, distinct from the existing free-text `searchGoogleBooks`), takes the first result, returns `volumeInfo.canonicalVolumeLink ?? volumeInfo.infoLink ?? null`. Reuses the existing `fetchWithRetry` for the same transient-503 tolerance already relied on elsewhere in this file.

**Discovered during implementation: `openLibraryId` is not always an Open Library key.** The single confirmed-metadata apply route (`app/api/books/[id]/openlibrary/apply/route.ts`, shared by both the post-upload review step and later manual review — there is no separate bulk-apply route) always writes `openLibraryId: details.key`, and `details.key` is `google:<volumeId>` when the confirmed candidate came from Google Books rather than Open Library. So the read helper must branch on this prefix: a `google:` id resolves to `https://books.google.com/books?id=<volumeId>` (free, no API call — we already have the exact volume), a `/`-prefixed id resolves to the Open Library link, and only when `openLibraryId` is absent entirely do we fall back to the cached `googleBooksLink`.

This means the apply route needs no changes at all — every book that goes through it already gets a free, exact link via the read helper. The ISBN-based Google Books API resolution is only needed for books that **never go through the apply flow**: the upload route (`app/api/books/route.ts`) always inserts `openLibraryId: null`, but does set `isbn` directly from EPUB metadata with no network call. That upload path is therefore the one and only call site for `resolveGoogleBooksLinkByIsbn` + persisting `googleBooksLink` ahead of any click.

**Two call sites for resolution, one shared helper:**
1. *Upload route* (`app/api/books/route.ts`) — right after a new book is inserted, if it has an ISBN (openLibraryId is always null at this point), resolve and persist `googleBooksLink`, best-effort.
2. *Lazy resolution on click* — a small API route (e.g. `POST /api/books/[id]/google-books-link`) that: reads the book, returns the link from the shared read helper if resolvable for free (Open Library or `google:` id), else the cached `googleBooksLink` if present, else resolves via ISBN, persists it, and returns it. The icon's click handler calls this route and opens the returned URL in a new tab (rather than a plain `<a href>`, since the link may not exist yet client-side).

**Icon click is a fetch-then-open, not a static anchor.** Because a pre-existing book's link might not be resolved yet, the client can't always render a plain `href` ahead of time. Alternative considered: pre-resolve during SSR of the library page. Rejected as the default path — it would mean every grid render potentially fans out Google Books calls for every unresolved book on the page, reintroducing the per-render cost this design is meant to avoid. SSR can still render the icon as *present* (based on `openLibraryId` or ISBN existence) without resolving the link itself.

## Risks / Trade-offs

- **[Risk]** Lazy per-click resolution means the first click for a given book has extra latency (a live Google Books round-trip) → **Mitigation**: acceptable one-time cost per book; subsequent clicks (by the same or other sessions) read the cached column instantly.
- **[Risk]** An ISBN with no Google Books match leaves the book with no link forever (cached as absent) even if Google's catalog later adds it → **Mitigation**: store "no match" as `null` (same as "not yet resolved") rather than a separate sentinel, so a future manual metadata-review re-apply naturally retries it; out of scope to build an automatic re-check.
- **[Risk]** Google Books quota usage grows with library size → **Mitigation**: bounded by "at most once per book, only for books lacking an Open Library id," which is the cheapest resolution strategy available given the existing data model.
