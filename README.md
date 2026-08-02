# mybooks

A self-hosted, personal EPUB library manager: Google-authenticated, invite-only,
per-user book catalogs with Calibre-like organization (series, tags, reading
status, ratings), optional Open Library metadata enrichment, and one-click
"send to e-reader" delivery via email.

Built with Next.js (App Router), Tailwind CSS, Drizzle ORM + SQLite
(`better-sqlite3`), NextAuth (Google provider), and nodemailer.

## First-run setup

### 1. Google OAuth

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (Web application type).
2. Add an authorized redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`
   (e.g. `http://localhost:3000/api/auth/callback/google` for local dev).
3. Note the generated Client ID and Client Secret.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in every value:

```bash
cp .env.example .env
```

- `ADMIN_EMAIL` — the Google account email that becomes the first admin on its
  first sign-in. Required.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1.
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`.
- `NEXTAUTH_URL` — the public base URL of the deployment.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` — an
  outbound SMTP account used to email EPUB attachments to e-reader devices.
- `DATABASE_PATH` / `BOOKS_STORAGE_PATH` — only relevant for local dev; in
  Docker these are pre-set in `docker-compose.yml` to paths inside the named
  volumes.

### 3. Local development

```bash
npm install
npm run db:generate   # only needed after changing lib/db/schema.ts
npm run db:migrate     # applies drizzle/*.sql to ./data/mybooks.db
npm run dev
```

Open http://localhost:3000. Sign in with the `ADMIN_EMAIL` Google account to
bootstrap the first admin, then use the "Invites" page to invite other users
by exact Google account email.

### 4. Docker deployment

```bash
docker compose up --build -d
```

This builds the production image and starts one container with two named
volumes: `mybooks-db` (the SQLite database file) and `mybooks-books` (the
per-user uploaded EPUB/cover storage tree). Both survive `docker compose down`
and image rebuilds; only `docker compose down -v` removes them.

Environment variables are read from the shell/`.env` file in the same
directory as `docker-compose.yml` (docker compose auto-loads `.env`).

## Notes

- Only EPUB is supported for import in this version.
- Open Library metadata is never applied automatically — search results are
  always a human-reviewed, explicit "apply" action.
- Kindle and other vendor inboxes typically require the sending address to be
  added to an approved-senders list on the vendor's site; that's a one-time
  setup step outside this app's control.
