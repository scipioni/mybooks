# mybooks

A self-hosted, personal EPUB library manager: Google-authenticated, invite-only,
per-user book catalogs with Calibre-like organization (series, tags, reading
status, ratings), optional Open Library metadata enrichment, and one-click
"send to e-reader" delivery via email.

Built with Next.js (App Router), Tailwind CSS, Drizzle ORM + SQLite
(`better-sqlite3`), NextAuth (Google provider), and nodemailer. Task automation
via [`Taskfile.yml`](https://taskfile.dev) (`task --list` for all commands).

## First-run setup

### 1. Google OAuth

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (Web application type).
2. Add an authorized redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`
   (e.g. `http://localhost:3012/api/auth/callback/google` for local dev).
3. Note the generated Client ID and Client Secret.

### 2. Google Books API key (optional)

Open Library metadata lookup works with no setup. Google Books is only used
as a fallback when Open Library finds nothing (e.g. an edition it hasn't
catalogued — many translated titles fall in this gap), and works anonymously
at a small daily quota even without a key. To raise that quota, get a free key:

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   select or create a project (the same project used for Google OAuth in
   step 1 works fine — no need for a separate one).
2. Go to **APIs & Services → Library**, search for **Books API**, and click
   **Enable**. No billing account is required for its free quota.
3. Go to **APIs & Services → Credentials → Create Credentials → API key**.
4. Recommended: click into the new key and under **API restrictions**, choose
   **Restrict key** and select only **Books API** — limits what the key can
   be used for if it ever leaks.
5. Copy the key into `GOOGLE_BOOKS_API_KEY` in `.env` (see step 3).

### 3. Environment variables

```bash
task setup
```

This installs dependencies, copies `.env.example` to `.env` (if it doesn't
already exist), and runs DB migrations. Then edit `.env` and fill in:

- `ADMIN_EMAIL` — the Google account email that becomes the first admin on its
  first sign-in. Required.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1.
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`.
- `NEXTAUTH_URL` — the public base URL of the deployment
  (`http://localhost:3012` for local dev).
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` — an
  outbound SMTP account used to email EPUB attachments to e-reader devices.
- `GOOGLE_BOOKS_API_KEY` — optional, from step 2. Leave blank to use Google
  Books' small anonymous quota, or unset entirely to skip that fallback (Open
  Library lookup still works either way).
- `DATABASE_PATH` / `BOOKS_STORAGE_PATH` — only relevant for local dev; in
  Docker these are pre-set in `docker-compose.yml` to paths inside the named
  volumes.

### 4. Local development

```bash
task dev          # starts next dev on http://localhost:3012
task dev:stop      # stops it (kills the process tree + clears the dev lock)
```

Open http://localhost:3012. Sign in with the `ADMIN_EMAIL` Google account to
bootstrap the first admin, then use the "Invites" page (`/admin/invites`) to
invite other users by their exact Google account email.

Other local dev tasks:

```bash
task build         # production build
task start         # run the production build
task lint          # ESLint
task typecheck     # tsc --noEmit
task db:generate   # generate a Drizzle migration after changing lib/db/schema.ts
task db:migrate    # apply pending migrations
task db:studio     # open Drizzle Studio
```

### 5. Docker deployment

```bash
task docker:build
task docker:up      # starts the app in the background on http://localhost:3012
task docker:logs    # tail logs
task docker:down    # stop (named volumes are preserved)
```

This runs one container with two named volumes: `mybooks-db` (the SQLite
database file) and `mybooks-books` (the per-user uploaded EPUB/cover storage
tree). Both survive `task docker:down` and image rebuilds; only
`docker compose down -v` removes them. Environment variables are read from
`.env` in the same directory as `docker-compose.yml`.

## Backup, restore, and migrating to another server

Full-instance backups (database + all users' book files) are exported to a
single timestamped archive under `./backups/`.

**Local (bare-metal) deployment:**

```bash
task backup:export
task backup:import -- <path-to-archive.tar.gz> [--force]
```

**Docker deployment:**

```bash
task docker:backup:export                                    # writes to ./backups on the host
task docker:down                                              # stop the container first
task docker:backup:import -- <filename-in-backups-dir> [--force]
task docker:up
```

**To migrate to a different server:** run the export on the source, copy the
resulting archive into the destination's `./backups/` directory, then run the
matching import task there. `--force` is required whenever the destination
already has a non-empty database. The archive does not include `.env` —
configure the destination's own `ADMIN_EMAIL`, Google OAuth credentials,
`NEXTAUTH_URL`, and SMTP settings before bringing it up.

## Releases

```bash
task release:patch   # or release:minor / release:major
```

Bumps the version in `package.json`, commits, and tags locally — it does not
push. Review the commit/tag, then `git push --follow-tags` yourself.

## Notes

- Only EPUB is supported for import in this version.
- Open Library metadata is never applied automatically — search results are
  always a human-reviewed, explicit "apply" action. Google Books (see setup
  step 2) is tried only as a fallback when Open Library finds nothing, and
  follows the same review-before-apply rule; matches from it are labeled
  "Google Books" in the results.
- Kindle and other vendor inboxes typically require the sending address to be
  added to an approved-senders list on the vendor's site; that's a one-time
  setup step outside this app's control.
