## Context

Greenfield project. See `proposal.md` - Why/What Changes for motivation. Key constraints established during exploration (not re-derived here):
- Deployed via Docker on infrastructure the user controls; expected scale is a handful of invited users, not public multi-tenancy at scale.
- No background workers or filesystem watchers — everything is request/response driven (uploads, on-demand Open Library lookups, on-demand sends).
- "Lightest possible database" was an explicit requirement, with an accepted future upgrade path.

## Goals / Non-Goals

**Goals:**
- Minimal operational footprint: one container, one SQLite file, one bind-mounted upload directory.
- Clear ownership boundaries: every book, device, and invite is scoped to exactly one user (or is admin-only).
- Keep the Open Library integration a pure read + user-confirm flow — no automatic writes to book data.

**Non-Goals:**
- Shared/public catalogs, social features, or cross-user recommendations.
- Background/scheduled jobs (directory watching, periodic re-sync with Open Library) — everything is user-triggered.
- Support for ebook formats other than EPUB in this change (MOBI/AZW3/PDF are out of scope; can be a later change).
- Building a generic plugin system for e-reader vendors — device delivery is a flat label + email address, not vendor-specific logic.

## Decisions

### Persistence: SQLite via Drizzle ORM (`better-sqlite3` driver)
Chosen over raw `better-sqlite3` (no ORM) and over Prisma.
- Drizzle's runtime is a thin query builder over SQL — no code-generation step, no separate query engine binary, which matches "lightest possible."
- Schema is defined in TypeScript and is dialect-portable: migrating to Postgres/Turso/libSQL later is a driver swap plus minor type changes, not a rewrite, satisfying "eventually upgrade with an ORM."
- Prisma was considered for its migration tooling and DX, but its runtime footprint (query engine binary, generated client) is heavier than justified for a single-file SQLite deployment.
- The SQLite file lives on a named Docker volume so it survives container rebuilds/redeploys.

### Authentication: NextAuth with Google provider, database-agnostic session strategy
- NextAuth's Google provider handles the OAuth flow; a `signIn` callback enforces the registration check described in the `auth` spec (reject unless the email matches `ADMIN_EMAIL` or an existing/redeemable user record).
- Sessions use JWT strategy (no session table required) to keep the schema minimal — session state doesn't need to survive in SQLite beyond the `users` table itself.

### Invite model: single-use, email-scoped rows in an `invites` table
- Alternative considered: generic shareable invite codes (any bearer redeems). Rejected per prior discussion — email-scoping removes the risk of a leaked link granting unintended access, at the cost of the admin needing to know the invitee's address upfront, which is acceptable for this app's scale.
- `invites` table: `id`, `email`, `invited_by` (admin user id), `redeemed_at` (nullable), `created_at`. Redemption is checked in the same `signIn` callback that enforces registration.

### File storage layout: per-user subdirectories under one volume
- `/data/books/<user_id>/<book_id>.epub` — keeps ownership obvious on disk and avoids filename collisions across users without needing a separate storage service.
- Covers stored alongside as `/data/books/<user_id>/<book_id>-cover.<ext>`, or served from a not-yet-fetched placeholder asset bundled with the app.

### EPUB metadata extraction: parse at upload time, synchronously
- EPUB is a zip; `container.xml` points to the OPF package document containing Dublin Core metadata (title, creator/author, identifiers) and the manifest entry for the cover image.
- Done synchronously in the upload request handler (no queue) since files are small and this is a personal-scale app — keeps the "no background workers" non-goal intact.

### Open Library integration: client-side confirm step, server-side apply
- Search hits Open Library's search API by title/author (or ISBN when known); results are returned to the client for display.
- Applying a candidate is a separate, explicit request carrying the chosen candidate's identifier — the server re-fetches full details server-side before writing, rather than trusting client-supplied metadata wholesale (avoids trusting arbitrary client input for what gets persisted).
- Sends a `User-Agent: mybooks/1.0 (<ADMIN_EMAIL>)` header on every request, per Open Library's guidance, for a higher rate limit (3 req/s identified vs 1 req/s anonymous) — reuses the already-required `ADMIN_EMAIL` rather than a separate contact field.
- Free-text search alone proved insufficient in practice: Open Library's catalog is missing many translated/non-English editions outright (confirmed by direct inspection — not a query bug, the edition genuinely isn't indexed), so title-based search for those returns either nothing or unrelated fuzzy matches. Two mitigations: (1) an exact ISBN lookup (`/isbn/{isbn}.json`), which identifies a specific edition regardless of language when the ISBN is known; (2) a Google Books fallback (below), for when neither Open Library path finds the edition at all.
- A candidate's key is either a work key (`/works/...`, from free-text search) or an edition key (`/books/...`, from ISBN lookup or Google Books). `fetchOpenLibraryDetails` handles both: work-level records lack ISBN/publish-date, so it fetches one of the work's editions as a fallback to get those fields.

### Google Books as a second metadata source
- Added after discovering Open Library's catalog gaps for translated editions (see above) — Google Books' library-scanning partnerships cover many editions Open Library doesn't have indexed.
- Both sources are queried unconditionally and concurrently (not "Google only if Open Library is empty") — Open Library returning *some* results doesn't mean they're relevant, since its free-text search can return unrelated fuzzy matches for a title it doesn't actually have. Results are merged, Google Books first (found to have better real-world hit rate for this app's actual books), each candidate labeled with its source.
- ISBN lookups try Google Books first, falling back to Open Library only if Google finds nothing.
- Google's documented `intitle:"..."` query keyword is used to scope plain-title queries to the title field specifically, reducing irrelevant matches versus an unscoped free-text query (skipped if the query already uses an operator like `isbn:`).
- **Reliability**: Google Books' search endpoint (`?q=...`) was measured with a ~50% single-request transient failure rate (`503`/`backendFailed`) even with a valid API key and no quota exhausted — direct volume-by-ID lookups were reliable in the same testing, so it's specific to the search endpoint. Mitigated with a retry helper (2 extra attempts, short backoff, only on `5xx`/`429`) that brought a live 8-request test to 8/8 success. A source's failure (after retries are exhausted) is reported back through the search API as `sourceErrors: { google, openLibrary }` rather than being indistinguishable from "no candidates" — this surfaces as a distinct notice in the UI so a rate-limited/outage state doesn't read as "this book isn't in Google Books."
- Optional `GOOGLE_BOOKS_API_KEY` env var raises the anonymous quota; the app works without one.

### Extended metadata fields: language, ISBN, publication year
- Added to `books` after discovering the original schema had no way to record them at all, despite EPUB metadata and both lookup sources providing them.
- Extracted from EPUB `dc:language`/`dc:identifier` on import (validating identifier shape even when an EPUB tags a non-ISBN value with an ISBN scheme — some EPUBs do this with internal hashes/proprietary IDs), and from a confirmed Open Library/Google Books match on apply.

### Bulk metadata review
- A dashboard-level flow (select multiple books → step through a single-book-at-a-time Open Library/Google Books review queue) rather than a "select all and auto-apply" bulk action, to preserve the never-auto-apply requirement while still saving the user from opening each book individually.

### E-reader delivery: synchronous SMTP send via nodemailer
- One outbound SMTP configuration for the whole deployment (env vars), used to send to whichever per-user device address is selected.
- No delivery queue/retry system in this change — a failed send is reported synchronously to the user (per the `ereader-delivery` spec), who can retry manually.
- Vendor approved-sender requirements (e.g. Kindle) are the user's responsibility to configure on the vendor side; out of this app's control.

### Cache-busting and stale client state, via `updatedAt`
- Two related bugs surfaced once metadata could be applied after initial upload: (1) the edit form (a client component seeded from server props at mount) kept showing pre-apply values after `router.refresh()`, since a prop update alone doesn't reset already-initialized `useState`; (2) the cover image URL never changed even when the underlying file did, so browsers served a cached copy for up to an hour (`Cache-Control: max-age=3600`).
- Fixed both with one new `updatedAt` column (bumped on every edit/apply): keying the edit form component on it forces a remount (and fresh state) whenever the book actually changes; appending it as a `?v=` query param cache-busts the cover image URL.

### Multi-file drag-and-drop upload
- Replaced the original single-file `<input type="file">` with a drop zone supporting multiple files, each uploaded independently with its own status (pending/uploading/done/error) and a small bounded concurrency (3 at a time) so a large batch doesn't hammer the server at once. One file's rejection (e.g. non-EPUB) doesn't block the rest of the batch.

### Invite revocation and duplicate/conflict rejection
- Added after finding that inviting an already-registered email, or an email with an already-pending invite, silently created an orphaned invite row that could never be meaningfully redeemed and had no way to remove — invite creation now rejects both cases, and a new admin-only revoke action removes a still-pending invite (rejected if already redeemed, to preserve it as a historical record).

### Deployment: single container, two named volumes
- Volumes: one for the SQLite database file, one for the per-user book storage tree.
- Required env vars: `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`.

## Risks / Trade-offs

- **SQLite under concurrent writes** → For this app's expected load (a handful of users, infrequent writes), SQLite's single-writer model is not a practical bottleneck. Mitigation if it ever becomes one: Drizzle's schema portability makes a Postgres migration straightforward.
- **Email-scoped invites require the admin to know invitees' exact Google email upfront** → Accepted trade-off for eliminating leaked-link risk; if this proves too rigid, a shareable-link mode could be added later as an additive change.
- **Synchronous EPUB parsing / email sending with no queue** → Large EPUB files or slow SMTP responses could make requests slow. Mitigation: acceptable at personal scale; revisit with a background job only if it becomes a real problem.
- **No automatic retry for failed e-reader deliveries** → User must notice the failure and retry manually; acceptable given the low volume and the explicit "report failure, don't hide it" requirement in the spec.
- **Per-user filesystem storage on a single volume** → No off-host backup built into this change. Mitigation: standard volume backup practices are an operational concern outside this change's scope.

## Open Questions

- Exact list of EPUB metadata fields to extract beyond title/author/cover (e.g. language, publisher, publication date) can be finalized during implementation without affecting the spec or approach.
- Whether device delivery addresses need per-device sender/from-address customization (some vendors are picky about the From header) can be resolved during implementation of the `ereader-delivery` capability.
