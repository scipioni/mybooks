## Why

Right now every book is private to the user who uploaded it — there's no way for people sharing this instance (e.g. a household) to see what someone else thought of a book they've both read. Books aren't linked across users at all: two people uploading the same title get two unrelated rows with no shared identity. Adding reviews that are visible to everyone gives the household a lightweight, shared "what did you think?" layer without turning the whole library public.

## What Changes

- A user can write a review (1-5 star rating + text) on a book **they own**. Reviewing a book you haven't uploaded yourself is out of scope — this is not a shared catalog/browse feature.
- Reviews require the book to already have an ISBN (populated by the existing OpenLibrary/Google Books metadata match flow, or extracted directly from the EPUB). If a book has no ISBN, the user is prompted to normalize its metadata first rather than being allowed to post an unlinkable review.
- Reviews are grouped strictly by **exact ISBN match** across all users. Two copies of the same work with different ISBNs (different editions, translations, print vs. digital) are treated as different books and do **not** share a review thread. This is an accepted simplification, not a bug — see design.md for the tradeoff.
- The star rating shown on a book's dashboard card and detail page changes from "the current user's own rating" to **the mean rating across all reviews for that ISBN** (falling back to the current per-user behavior when no reviews exist yet for that ISBN). The user's own personal rating field is unchanged and still exists for their own tracking/filtering.
- **BREAKING** (behavioral, not API): the star indicator on a book no longer always reflects the viewing user's personal opinion — once reviews exist for a book's ISBN, it reflects the group average instead.

## Capabilities

### New Capabilities
- `book-reviews`: users can write, edit, delete, and read reviews (rating + text) on books they own; reviews are grouped by ISBN and visible to every registered user of the instance.

### Modified Capabilities
- `book-library`: the "Books display a star rating" requirement changes — the displayed star indicator reflects the ISBN-grouped review average when reviews exist for that book, instead of always being the viewing user's own `rating` field.

## Impact

- `lib/db/schema.ts`: new `reviews` table (userId, bookId or isbn, rating, body, timestamps).
- New API routes for creating/editing/deleting a review and reading a book's review list + average.
- `components/LibraryGrid.tsx`, `app/library/[id]/page.tsx`: rating display now reads the aggregate instead of (or alongside) `book.rating`.
- `app/library/[id]/page.tsx`: new review list/composer UI, gated on the book having an ISBN — reuses the existing `OpenLibrarySearch` normalize-metadata flow as the "add an ISBN first" path when missing.
- No change to upload, metadata-normalization, or storage-path code from prior changes.
