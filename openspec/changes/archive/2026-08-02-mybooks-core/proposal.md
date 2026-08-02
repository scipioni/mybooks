## Why

There is no self-hosted way to manage a personal EPUB collection with Calibre-like organization, on-demand metadata enrichment from Open Library, and one-click delivery to e-readers (Kindle, Kobo, etc.), while supporting multiple private users behind a single Google-authenticated, invite-only deployment.

## What Changes

- Stand up a new Next.js + Tailwind application (`mybooks`) from scratch.
- Add Google OAuth sign-in restricted to registered users only; unregistered sign-ins are rejected.
- Add an admin bootstrap mechanism: the Google account matching the `ADMIN_EMAIL` environment variable is auto-provisioned as admin on first login.
- Add email-scoped, invite-based registration: an admin issues an invite tied to a specific email address; only that Google account can redeem it to create a user.
- Add a private, per-user book library (no shared catalog) with upload-based EPUB import (no filesystem directory scanning).
- Parse EPUB container/OPF metadata on upload to prefill title, author, and related fields.
- Add optional Open Library lookup during import (and on demand afterward) with a review/confirm step before any suggested metadata or cover art is applied — never auto-applied.
- Add Calibre-like organization: series, tags, reading status, ratings, and search/filter/sort across a user's own library.
- Add per-user e-reader devices (label + delivery email, supporting multiple devices such as Kindle and Kobo) and a "send to device" action that emails the EPUB as an attachment via SMTP.
- Add a Dockerized deployment (Dockerfile + compose) with named volumes for uploaded book files and the SQLite database file, configured via environment variables (`ADMIN_EMAIL`, Google OAuth credentials, SMTP credentials, NextAuth secret/url).
- Use SQLite via Drizzle ORM as the initial persistence layer, chosen for minimal footprint with a straightforward future migration path to a heavier engine if needed.
- Add multi-file drag-and-drop upload, replacing the original single-file picker.
- Add Google Books as a second metadata source alongside Open Library (queried concurrently, results merged and labeled by source), since Open Library's catalog is missing many translated/non-English editions; falls back between the two for ISBN lookups and reports a source's failure distinctly from a genuine no-match.
- Extend book records with language, ISBN, and publication year, populated from EPUB metadata on import and from confirmed metadata-source matches; add a dashboard indicator and filter for books with incomplete metadata (missing any of author/cover/language/ISBN/publication year).
- Add a bulk metadata review flow: select multiple books and step through an Open Library/Google Books review queue one at a time, still requiring explicit confirm/skip per book.
- Add invite revocation (admin-only, blocked for already-redeemed invites) and reject invite creation for emails that are already registered or already have a pending invite.
- Add star-rating display on the dashboard and detail view, plus a minimum-rating dashboard filter.

## Non-Goals (this change does not add)

Import formats other than EPUB (MOBI/AZW3/PDF) remain out of scope.

## Capabilities

### New Capabilities
- `auth`: Google OAuth sign-in gated to registered users; admin bootstrap via `ADMIN_EMAIL`; admin roles.
- `invites`: Admin-issued, email-scoped invites and their redemption flow for new user registration.
- `book-library`: Private per-user book catalog — EPUB upload/import, metadata storage, organization (series, tags, reading status, rating), and search/filter/sort.
- `open-library-metadata`: Searching Open Library, reviewing/confirming candidate matches, and applying metadata or cover art to a book.
- `ereader-delivery`: Managing per-user e-reader device addresses and sending a book to a selected device via email.

### Modified Capabilities
- None — this is a greenfield project with no pre-existing specs.

## Impact

- **New codebase**: Next.js app (App Router) with Tailwind CSS.
- **New dependencies**: NextAuth (Google provider), Drizzle ORM + `better-sqlite3`, an EPUB metadata parser, nodemailer, an Open Library API client, a Google Books API client.
- **New infrastructure**: Dockerfile, docker-compose, two named volumes (book files, SQLite database file), and new required environment variables for auth, SMTP, and admin bootstrap; one new optional environment variable, `GOOGLE_BOOKS_API_KEY`, for a higher Google Books quota.
- **Data model**: New `users`, `invites`, `devices`, and `books` tables (schema detailed in `design.md`); `books` extended with `language`, `isbn`, `publicationYear`, and `updatedAt`.
- **External services**: Google OAuth, Open Library API, Google Books API (works with no key at a small anonymous quota), outbound SMTP provider (subject to each e-reader vendor's inbound mail restrictions, e.g. Kindle's approved-sender list, which is a user-side setup step outside this app's control).
