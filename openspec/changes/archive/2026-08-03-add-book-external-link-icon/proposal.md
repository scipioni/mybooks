## Why

Users have no quick way to look up a book they've uploaded on a public catalog (Open Library or Google Books) to check editions, read a description, or compare covers. The data needed to build that link — an Open Library identifier or an ISBN — is already captured on the book record; there's just no link surfaced anywhere in the UI.

## What Changes

- Add a small icon on each book's cover in the library grid that opens the book's canonical external listing in a new tab.
- Link resolution priority per book:
  1. If the book already has an `openLibraryId`, link directly to `https://openlibrary.org{openLibraryId}` — no extra network call, the data is already on the record.
  2. Otherwise, if the book has an ISBN, resolve a Google Books link via an `isbn:{isbn}` search against the Google Books API, using the result's `canonicalVolumeLink` (falling back to `infoLink` if absent).
  3. If neither an Open Library identifier nor an ISBN is available, the icon is not shown.
- The resolved Google Books link is cached on the book record (new `googleBooksLink` column) so the lookup happens at most once per book:
  - Populated going forward at upload/metadata-review time, alongside the existing Open Library/Google Books metadata enrichment flow.
  - For books that predate this change and have no cached link yet, resolved lazily on first icon click and persisted immediately after.
- Icon only appears on the library grid card (`LibraryGrid.tsx`) for now; the logged-out landing page grid is out of scope.

## Capabilities

### New Capabilities
- `external-book-link`: Resolves, caches, and surfaces a link to a book's canonical listing on Open Library or Google Books.

### Modified Capabilities
(none — this does not change existing book-library or open-library-metadata requirements, it adds a new one alongside them)

## Impact

- **Schema**: new `googleBooksLink` column on the `books` table (`lib/db/schema.ts`).
- **Backend**: extend the existing upload/metadata-review enrichment flow (`lib/googlebooks.ts`, the openlibrary apply/search routes) to persist a resolved Google Books link when applicable; new endpoint (or extension of an existing one) to lazily resolve+persist the link for a book on first click.
- **Frontend**: `components/LibraryGrid.tsx` gains an icon affordance per card that opens the resolved link in a new tab.
- **External dependency**: Google Books API usage grows slightly (one lookup per book lacking an Open Library id, amortized to zero after first resolution) — no change to Open Library usage.
