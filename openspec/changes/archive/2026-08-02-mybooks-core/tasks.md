## 1. Project Scaffolding

- [x] 1.1 Initialize Next.js (App Router) project with TypeScript and Tailwind CSS
- [x] 1.2 Set up Drizzle ORM with `better-sqlite3` driver and a local SQLite file for development
- [x] 1.3 Define Drizzle schema: `users`, `invites`, `devices`, `books` tables
- [x] 1.4 Configure environment variable loading/validation (`ADMIN_EMAIL`, Google OAuth credentials, NextAuth secret/url, SMTP credentials)

## 2. Auth & Admin Bootstrap

- [x] 2.1 Configure NextAuth with the Google provider
- [x] 2.2 Implement `signIn` callback: allow if email matches `ADMIN_EMAIL`, or an existing user record, or a redeemable invite; deny otherwise
- [x] 2.3 Auto-provision the `ADMIN_EMAIL` account as an admin user on its first successful sign-in
- [x] 2.4 Add role field/check (admin vs regular user) and middleware/guards for admin-only routes
- [x] 2.5 Add sign-in/sign-out UI and a denied-access page for rejected sign-ins

## 3. Invites

- [x] 3.1 Implement invite creation (admin-only): store email, inviter, timestamps
- [x] 3.2 Wire invite redemption into the sign-in flow (create user record, mark invite redeemed, matched by exact email)
- [x] 3.3 Prevent re-redemption of an already-redeemed invite
- [x] 3.4 Build admin UI to list pending invites and issue new ones

## 4. Book Library Core

- [x] 4.1 Implement EPUB upload endpoint: validate file is a well-formed EPUB, store under `/data/books/<user_id>/<book_id>.epub`
- [x] 4.2 Parse `container.xml`/OPF package metadata on upload to extract title, author, and other available fields
- [x] 4.3 Extract embedded cover image from the EPUB manifest when present; fall back to a placeholder cover
- [x] 4.4 Create book record scoped to the uploading user with extracted metadata
- [x] 4.5 Implement per-user authorization checks on all book read/write/delete operations
- [x] 4.6 Implement book edit endpoint/UI: title, author, series (name + position), tags, reading status, rating
- [x] 4.7 Implement book delete: remove database record and stored file
- [x] 4.8 Implement library list view with search (title/author/series), filter (tag, reading status), and sort (title/author/date added)
- [x] 4.9 Build book detail view and upload UI

## 5. Open Library Metadata

- [x] 5.1 Implement Open Library search client (by title/author/ISBN)
- [x] 5.2 Build search-and-review UI presenting candidates with enough detail to distinguish them (title, author, cover thumbnail, publication info)
- [x] 5.3 Implement "apply candidate" endpoint: server re-fetches full candidate details and writes metadata/cover only on explicit confirmation
- [x] 5.4 Store the Open Library identifier on the book record when a candidate is applied
- [x] 5.5 Wire the optional lookup step into both the upload flow (skippable) and on-demand from an existing book's detail view

## 6. E-Reader Delivery

- [x] 6.1 Implement device management endpoints/UI: add/edit/remove device (label + delivery email), scoped per user
- [x] 6.2 Configure nodemailer with deployment-wide SMTP settings
- [x] 6.3 Implement "send to device" endpoint: authorize book ownership and device ownership, email the EPUB as an attachment
- [x] 6.4 Surface send success/failure to the user (no silent failures)
- [x] 6.5 Build "send to device" UI action from the book detail view, with device selection when more than one exists

## 7. Deployment

- [x] 7.1 Write Dockerfile for the Next.js app (production build)
- [x] 7.2 Write docker-compose with named volumes for the SQLite database file and the per-user book storage directory
- [x] 7.3 Document required environment variables and first-run setup (setting `ADMIN_EMAIL`, Google OAuth app configuration, SMTP configuration)
- [x] 7.4 Verify data persists across container rebuild/restart (volumes retain database and book files)

## 8. Multi-File Upload

- [x] 8.1 Replace single-file upload with a drag-and-drop zone supporting multiple files
- [x] 8.2 Queue and upload files independently with bounded concurrency and per-file status
- [x] 8.3 Ensure one invalid file in a batch doesn't block the rest

## 9. Extended Metadata Fields (language, ISBN, publication year)

- [x] 9.1 Add `language`, `isbn`, `publicationYear` columns to `books` (migrations)
- [x] 9.2 Extract `dc:language` and a validated ISBN from EPUB metadata on upload
- [x] 9.3 Make language/ISBN/publication year editable on the book detail view
- [x] 9.4 Display language/ISBN/publication year on the book detail view

## 10. Google Books Fallback & Multi-Source Search

- [x] 10.1 Implement a Google Books search + details client, matching the existing candidate/details shape
- [x] 10.2 Query Google Books and Open Library concurrently for free-text search; merge and label results by source
- [x] 10.3 Try both sources for ISBN lookups, falling back from one to the other
- [x] 10.4 Scope plain-title Google Books queries with `intitle:"..."` for precision
- [x] 10.5 Add a language-narrowing filter to free-text search (Open Library's `language:` field query)
- [x] 10.6 Add retry with backoff for Google Books' search endpoint (measured ~50% transient failure rate)
- [x] 10.7 Report per-source failures (`sourceErrors`) distinctly from a genuine no-candidates result, surfaced in the UI
- [x] 10.8 Extract and apply language/ISBN/publication year from confirmed candidates (both sources)
- [x] 10.9 Add `GOOGLE_BOOKS_API_KEY` as an optional environment variable; send an identifying `User-Agent` to Open Library

## 11. Bulk Metadata Review

- [x] 11.1 Build a book-selection UI on the dashboard for choosing which books to review
- [x] 11.2 Step through selected books one at a time, searching and presenting candidates for confirm/skip
- [x] 11.3 Support skipping a book with no candidates and advancing to the next

## 12. Invite Revocation & Conflict Rejection

- [x] 12.1 Reject invite creation for an email that already has a pending invite
- [x] 12.2 Reject invite creation for an email that already belongs to a registered user
- [x] 12.3 Add an admin-only revoke endpoint/UI for pending invites; reject revoking an already-redeemed invite

## 13. Dashboard Enhancements

- [x] 13.1 Display star rating on dashboard cards and the detail view
- [x] 13.2 Add a minimum-rating dashboard filter
- [x] 13.3 Add an incomplete-metadata indicator per book and a corresponding dashboard filter
- [x] 13.4 Fix stale client state after metadata apply: add `updatedAt`, key the edit form on it to force a resync
- [x] 13.5 Fix cover image caching: cache-bust the cover URL with `updatedAt`

## 14. Verification

- [ ] 14.1 Manually verify auth rejection for unregistered/unrelated Google accounts
- [ ] 14.2 Manually verify full invite → redemption → login flow
- [x] 14.3 Manually verify upload → metadata extraction → optional Open Library/Google Books review → apply flow
- [ ] 14.4 Manually verify send-to-device flow against at least one real device email (or a test SMTP sink)
- [ ] 14.5 Manually verify cross-user isolation (books, devices, invites not visible/accessible across accounts)
