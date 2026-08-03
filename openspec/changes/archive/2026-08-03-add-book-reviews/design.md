## Context

See proposal.md for motivation. Relevant existing state:

- `books` rows are strictly per-owner (`ownerId`); there is no "work" entity shared across users.
- A book's `isbn` is populated only after the existing OpenLibrary/Google Books metadata match flow is applied (`app/api/books/[id]/openlibrary/apply/route.ts`), or if the source EPUB's own OPF metadata already contained one (`lib/epub.ts` `parseEpub`).
- `books.rating` is a private, per-user 0-5 integer, editable via `PATCH /api/books/[id]`, and currently the only source for the star indicator on the dashboard grid (`components/LibraryGrid.tsx`) and detail page.
- Exploration (see conversation) confirmed the match keys produced by the metadata flow (`openLibraryId`) are inconsistent across sources (work key vs. edition key vs. `google:<id>`) and unsuitable for cross-user grouping. `isbn` is the one field populated consistently regardless of source, at the cost of being edition-specific (different translations/prints of the same work won't group) — an accepted limitation per the proposal.

## Goals / Non-Goals

**Goals:**
- Let a user attach a rating + text review to a book they own.
- Make reviews for the same ISBN visible to every user, with an aggregate (mean) rating.
- Gate review creation on the book already having an ISBN, prompting metadata normalization instead of allowing an ungrouped review.

**Non-Goals:**
- No shared "work" identity beyond exact ISBN string equality — no title/author fuzzy matching, no OpenLibrary work-key resolution.
- No browsing or reviewing books the current user doesn't own themselves.
- No comment threads/replies — one review per user per ISBN, editable in place.
- No moderation, reporting, or visibility controls on reviews (small trusted household instance).

## Decisions

**Reviews are keyed by `(userId, isbn)`, not by `bookId`.**
A `reviews` row stores the ISBN directly (denormalized, copied from the book at creation time) rather than joining through `books.bookId → books.isbn` on every read. Rationale: the whole point is cross-user grouping by ISBN, and denormalizing avoids ambiguity if a user owns more than one row with the same ISBN. A `bookId` column is kept alongside purely for provenance (which of the reviewer's own book rows they wrote it against — used only to link back to "your review" on your own detail page), not for the grouping join.

*Alternative considered*: a canonical `works` table keyed by ISBN, with `books.workId` FK. Rejected as overbuilt for this scale (per-ISBN aggregation via a plain `GROUP BY isbn` query is cheap enough at household-library sizes) and it would invite scope creep toward the "real" work-identity problem (option 2 from exploration), which was explicitly declined.

**A review's ISBN is a snapshot at creation time, not a live join.**
If a book's `isbn` is later changed (e.g. re-normalized to a different edition), existing reviews keep their original ISBN grouping rather than silently moving to a new group. Re-normalizing after reviewing requires deleting and re-adding the review if the user wants it under the new ISBN.

*Alternative considered*: live join through `books.isbn` at read time. Rejected — a metadata correction shouldn't retroactively and silently move a review (and its rating) into a different aggregate that the reviewer didn't choose.

**One review per `(userId, isbn)`, enforced by a unique constraint.**
Posting again for the same ISBN edits the existing review rather than creating a second one. If a user owns two book rows that happen to share an ISBN (duplicate upload), they still get exactly one review for that ISBN.

**Force-match gate lives in the review-creation API, not just the UI.**
`POST /api/books/[id]/reviews` (or equivalent) checks `book.isbn` server-side and rejects with a 422/error payload if absent, regardless of what the client shows. The book detail page uses that same signal to render "Normalize metadata to enable reviews" (linking into the existing `OpenLibrarySearch` component) instead of a composer.

**Star rating display: aggregate-if-present, personal-otherwise.**
`components/LibraryGrid.tsx` and the detail page compute, per book, `avgRating = mean(reviews.rating WHERE isbn = book.isbn)`. If `avgRating` exists, render that (rounded to nearest half/whole star per existing `StarRating` component's supported granularity) instead of `book.rating`. If no reviews exist yet for that ISBN, fall back to the current per-user `book.rating` behavior unchanged. The user's own `rating` field and its minimum-rating filter are untouched — they still read/write `books.rating` directly, independent of reviews.

*Alternative considered*: always show personal rating and add reviews as a separate, secondary UI element (e.g. a "3.6 avg (4 reviews)" line under the star indicator) rather than replacing what the star indicator means. Rejected because the user's explicit decision during exploration was "rating now becomes the mean of all users" — the proposal treats this as the intended (breaking, behavioral) change, not an addition.

## Risks / Trade-offs

- **[Risk]** Different editions/translations of the same work never share a thread (by design, per proposal) → users may be confused why their partner's review of the Italian edition doesn't show up on their English copy. **Mitigation**: surface the ISBN (or "no matching reviews for this edition yet") in the UI so it's legible, not silent.
- **[Risk]** A book without an ISBN can't be reviewed until normalized, which may surprise users who just want to leave a quick note → **Mitigation**: the gate reuses the existing, already-familiar normalize-metadata flow as a one-click path, not a dead end.
- **[Risk]** Editing your own book's metadata (including ISBN) is unrestricted today and not treated as sensitive for a small household — a review's snapshot-ISBN approach means a mismatched/incorrect ISBN entered by a user could group their review with the wrong book, or fail to group with the right one. **Mitigation**: none beyond what metadata normalization already provides (server re-fetches from OpenLibrary/Google before persisting `isbn`) — accepted given the trust model.
- **[Risk]** Aggregate rating recomputed on every read (no caching/materialization) → fine at expected scale (single household, dozens–hundreds of books); would need revisiting if the instance ever hosted many more users/books.

## Migration Plan

- Add `reviews` table via `drizzle-kit generate` + `db:migrate` (additive; no existing data to backfill).
- No changes to existing tables' schemas.
- Rollback: drop the `reviews` table and revert the rating-display change; no data loss for existing `books` rows since `books.rating` is untouched.
