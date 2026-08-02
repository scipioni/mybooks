# Manual verification checklist (Group 8 of tasks.md)

These steps require a real Google OAuth app and a real (or sink) SMTP account
configured via `.env` / `docker-compose.yml` env vars — they can't be executed
without live credentials, so they're left unchecked in `tasks.md`. Run them
once the deployment has real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and SMTP
settings in place.

Useful tip: [Mailtrap](https://mailtrap.io) or [MailHog](https://github.com/mailhog/MailHog)
work well as an SMTP sink for 8.4 without needing a real e-reader.

## 8.1 — Auth rejection for unregistered accounts

1. Set `ADMIN_EMAIL` to your own Google account and deploy/run the app.
2. Sign in with `ADMIN_EMAIL` → expect success, and a `users` row is created
   with `role = admin` (check via `npm run db:studio` or sqlite3 CLI).
3. Sign out. Sign in with a **different** Google account that has never been
   invited and doesn't match `ADMIN_EMAIL`.
4. Expect: redirected to `/denied`, no session cookie set, and no row added
   to `users` for that email.
5. Sign in again with the same admin account → expect it signs in as the
   existing admin without creating a duplicate `users` row.

## 8.2 — Invite → redemption → login flow

1. As the admin, go to `/admin/invites` and submit a second Google account's
   exact email address.
2. Confirm the new row appears under "Pending invites".
3. Sign out, then sign in with that invited Google account.
4. Expect: sign-in succeeds, a new `users` row is created with `role = user`,
   and the invite's `redeemed_at` is set (no longer listed as pending on
   `/admin/invites`).
5. Sign out and sign in again with the same account → expect it signs in as
   the existing user without re-redeeming or duplicating the invite.
6. Attempt to sign in with a third, uninvited Google account → expect denial
   per 8.1.

## 8.3 — Upload → metadata extraction → Open Library → apply

1. As a registered user, go to `/library` and upload a real `.epub` file that
   has embedded Dublin Core metadata (title/author) and a cover image.
2. Expect: the book appears with title/author prefilled from the EPUB and its
   real cover shown (not the placeholder).
3. Upload a non-EPUB file (e.g. a renamed `.txt`) → expect the upload is
   rejected with an error and no book record is created.
4. Upload an EPUB with no embedded cover → expect the placeholder cover is
   shown.
5. Open a book's detail page, click "Look up on Open Library", search, and
   confirm candidates show title/author/cover/publication year.
6. Click "Use this" on a candidate → expect the book's title/author/cover
   update, and `open_library_id` is stored (visible on the detail page).
7. On a different book, open the lookup and close it without applying →
   expect the book's metadata is unchanged.

## 8.4 — Send-to-device

1. Go to `/devices` and add a device with a label and a delivery email you
   control (or your SMTP sink's catch-all address).
2. Open a book you own, select the device (if you have more than one, confirm
   the selector appears), and click "Send to device".
3. Expect a success message, and the EPUB arrives as an attachment at the
   configured address (check your inbox or SMTP sink).
4. Temporarily break the SMTP config (wrong host/port) and repeat → expect an
   explicit failure message on screen, not a silent "success".

## 8.5 — Cross-user isolation

Using two different registered accounts (e.g. the admin and an invited user):

1. Confirm each account's `/library` only shows books it uploaded — the other
   account's books are never listed.
2. Try requesting `/api/books/<other-user's-book-id>` directly (e.g. via
   browser dev tools or curl with that user's session cookie) → expect a 403.
3. Confirm `/devices` only shows devices the signed-in user created, and that
   sending to another user's device ID (crafted manually) is rejected (403).
4. Confirm a non-admin user cannot load `/admin/invites` (redirected to
   `/denied`) and gets 401/403 from `POST /api/invites`.
