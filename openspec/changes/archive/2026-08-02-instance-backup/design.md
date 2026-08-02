## Context

See `proposal.md` for motivation. This is CLI/ops tooling, not app UI — implemented as shell scripts wired into the project's `Taskfile.yml`, consistent with how the rest of the project's dev/ops workflow is already organized (see `mybooks-core`'s design for the SQLite/Drizzle and Docker volume layout this operates on).

## Goals / Non-Goals

**Goals:**
- One command to export, one to import, for both local and Docker deployments.
- Never lose data silently — a naive SQLite file copy under WAL mode can miss recent writes; restore must not clobber existing data without explicit confirmation.

**Non-Goals:**
- Incremental/scheduled backups — this is an on-demand, full-snapshot export only.
- Encrypting or otherwise protecting the archive at rest — it contains the full database (including all users' data) and book files; operators are responsible for securing wherever they store it.
- An in-app UI for backup/restore — this is deliberately an operator-facing CLI action, not an end-user feature.

## Decisions

### Archive layout: `manifest.json` + `db/<filename>` + `books/...`
- Chosen so the same layout works whether the source is a local deployment (`DATABASE_PATH`/`BOOKS_STORAGE_PATH` from `.env`) or a Docker deployment (whose volumes already mount at `/data/db` and `/data/books` — tarring those two directories directly produces the identical `db/`+`books/` structure with no extra nesting logic needed).
- `manifest.json` records the original database filename (so restore knows what to name it at the destination) and the export timestamp.

### Safe database export via `better-sqlite3`'s online-backup API, not a raw file copy
- SQLite runs in WAL mode; recent writes can sit in a `.db-wal` sidecar file rather than the main `.db` file. A plain `cp` of just the main file can silently omit those writes.
- `scripts/backup-db.cjs` uses `new Database(src, { readonly: true }).backup(dest)` — the SQLite online-backup API, which produces a single consistent, fully-checkpointed file regardless of WAL state. Restore then just copies this clean file into place; no special handling needed on the restore side.

### Restore safety: refuse to overwrite non-empty existing data without `--force`
- Restore is destructive (replaces the DB file and the entire book storage tree). Checking for a non-empty existing database before proceeding, and requiring an explicit `--force` flag to override, prevents an accidental restore from destroying live data — the primary risk with any restore tooling.

### Docker path: bind-mounted `./backups` directory, ephemeral one-off container for restore
- `docker-compose.yml` gets a `./backups:/backup` mount so the running container can write an export directly to a host-accessible location (`task docker:backup:export` execs into the live container).
- Restore uses `docker compose run --rm` (a fresh one-off container against the same named volumes) rather than execing into the live container, since overwriting the database file out from under a running server is unsafe — the README instructs stopping the container first (`task docker:down`).

## Risks / Trade-offs

- **Archive contains everything, unencrypted** → Operator's responsibility to store/transfer it securely (e.g. over `scp`, not public hosting). Documented in the README, not enforced by the tool.
- **No automatic backup schedule** → This is a manual, on-demand action; an operator who wants regular backups needs to script/cron `task backup:export` themselves. Acceptable for personal-scale deployments; could be added later without changing the export/restore format.
- **Restoring while the app is running (local/bare-metal path)** → The local `backup:import` task doesn't stop `next dev`/`next start` for you; restoring into a live database's file out from under an open connection is the operator's responsibility to avoid (stop the app first). Docker's restore path avoids this by using a fresh container instead of the live one.
