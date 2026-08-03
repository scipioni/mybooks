## 1. Data model

- [x] 1.1 Add `reviews` table to `lib/db/schema.ts`: `id`, `userId` (FK users), `bookId` (FK books, provenance only), `isbn` (snapshot at creation, not live-joined), `rating` (1-5 int), `body` (text), `createdAt`, `updatedAt`. Unique constraint on `(userId, isbn)`.
- [x] 1.2 Generate and run the migration (`task db:generate`, `task db:migrate`).

## 2. Review API

- [x] 2.1 `POST /api/books/[id]/reviews`: create-or-update the caller's review for the owned book's current `isbn`. Reject with a clear error if the book has no `isbn` (no silent fallback). Reject if the caller doesn't own the book.
- [x] 2.2 `DELETE /api/books/[id]/reviews`: delete the caller's own review for that book's isbn (no-op / 404 if none exists). Reject if the caller doesn't own the book or doesn't own the review.
- [x] 2.3 `GET /api/books/[id]/reviews`: return all reviews for the owned book's current `isbn` (reviewer name, rating, body, timestamps) plus the computed mean rating. Requires the caller to own the book (per proposal: no browsing books you don't own).

## 3. Rating aggregation

- [x] 3.1 Add a shared query/helper (server-side) that computes mean rating for a given ISBN from the `reviews` table.
- [x] 3.2 Update the book list query (`app/library/page.tsx`) to also fetch each returned book's aggregate rating (batched, not N+1) alongside existing fields.
- [x] 3.3 Update `components/LibraryGrid.tsx` and the detail page to render the aggregate rating when present for that book's ISBN, falling back to the existing personal `rating` display when no reviews exist yet — per the `book-library` spec delta.
- [x] 3.4 Confirm the minimum-rating filter (`app/library/page.tsx`) still filters on the viewing user's own `rating`, unaffected by the display change.

## 4. Review UI on the book detail page

- [x] 4.1 Add a review list section to `app/library/[id]/page.tsx` showing all reviews for the book's ISBN (reviewer name, stars, body, date).
- [x] 4.2 Add a review composer (rating + text) for the current user's own review; pre-fill and switch to "update"/"delete" mode if they already have one for that ISBN.
- [x] 4.3 When the book has no ISBN, replace the composer with a prompt to normalize metadata first, linking into the existing `OpenLibrarySearch` component instead of a dead end.

## 5. Verification

- [x] 5.1 `npx tsc --noEmit` and lint clean.
- [ ] 5.2 Manual dev-loop check (per `next-dev-loop` skill): create a review, confirm it appears on a second account's copy of the same ISBN, confirm the star indicator switches to the aggregate, confirm the no-ISBN gate prompts normalization instead of allowing a submit, confirm a non-owner cannot see/edit another user's un-owned book's reviews via direct API calls.
