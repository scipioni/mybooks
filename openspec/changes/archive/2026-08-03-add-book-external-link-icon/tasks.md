## 1. Schema

- [x] 1.1 Add nullable `googleBooksLink` column to the `books` table in `lib/db/schema.ts`
- [x] 1.2 Generate and apply the corresponding Drizzle migration

## 2. Google Books link resolution

- [x] 2.1 Add `resolveGoogleBooksLinkByIsbn(isbn)` to `lib/googlebooks.ts`: queries `q=isbn:{isbn}`, returns the first result's `volumeInfo.canonicalVolumeLink ?? volumeInfo.infoLink ?? null`, reusing `fetchWithRetry`
- [x] 2.2 Add a shared helper (e.g. in `lib/googlebooks.ts` or a new `lib/externalBookLink.ts`) that, given a book row, returns its external listing link: `openlibrary.org{openLibraryId}` if present, else the cached `googleBooksLink` if present, else `null` (does not resolve — pure read)

## 3. Persist link during upload / metadata-review flow

- [x] 3.1 In the upload flow, after a book is saved without an ISBN-independent Open Library match, call `resolveGoogleBooksLinkByIsbn` and persist the result to `googleBooksLink` (the openlibrary apply route needs no change — see design.md note on the `google:<id>` discovery, it already yields a free link via the read helper)
- [x] 3.2 Ensure a failed or empty Google Books lookup does not block or fail the surrounding upload request

## 4. Lazy resolution endpoint

- [x] 4.1 Add `POST /api/books/[id]/google-books-link` (scoped to the requesting user's own book): if `openLibraryId` is present, return that link; else if `googleBooksLink` is already cached, return it; else if an ISBN exists, resolve via `resolveGoogleBooksLinkByIsbn`, persist it, and return it; else return no link
- [x] 4.2 Return a clear "no link available" response when neither source can be resolved

## 5. UI: icon on the library grid

- [x] 5.1 In `components/LibraryGrid.tsx`, show the external-listing icon on a book's cover when the book has an `openLibraryId` or an ISBN (pass these fields through from `app/library/page.tsx`)
- [x] 5.2 Wire the icon's click handler to call the lazy-resolution endpoint and open the returned link in a new tab; do nothing (or show a brief inline notice) if no link is returned
- [x] 5.3 Ensure the click does not also trigger the card's existing navigation to the book detail page (`stopPropagation`, consistent with the existing checkbox/author-filter click handling on the same card)

## 6. Verification

- [ ] 6.1 Manually verify: a book with an `openLibraryId` shows the icon and opens the Open Library page immediately (no network delay)
- [ ] 6.2 Manually verify: a pre-existing book with an ISBN but no cached link shows the icon, resolves on first click, and opens Google Books; a second click reuses the cached link
- [ ] 6.3 Manually verify: a book with neither an Open Library id nor an ISBN shows no icon
