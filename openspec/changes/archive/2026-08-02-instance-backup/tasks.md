## 1. Safe Database Export

- [x] 1.1 Implement `scripts/backup-db.cjs` using `better-sqlite3`'s online-backup API for a WAL-safe snapshot
- [x] 1.2 Verify a write sitting only in the `.db-wal` file survives an export/restore round trip

## 2. Export/Restore Scripts

- [x] 2.1 Implement `scripts/backup-export.sh`: build `manifest.json` + `db/` + `books/` archive under `./backups`
- [x] 2.2 Implement `scripts/backup-restore.sh`: extract, validate manifest, refuse to overwrite non-empty existing data without `--force`
- [x] 2.3 Verify a full export → restore round trip preserves users, book records, and book/cover files

## 3. Taskfile & Docker Wiring

- [x] 3.1 Add `task backup:export` / `task backup:import` for local/bare-metal deployments
- [x] 3.2 Add `./backups:/backup` bind mount to `docker-compose.yml`; copy `scripts/` into the Docker runtime image
- [x] 3.3 Add `task docker:backup:export` (execs into the live container) and `task docker:backup:import` (fresh one-off container against the named volumes)

## 4. Documentation

- [x] 4.1 Document local and Docker export/restore commands in the README
- [x] 4.2 Document the migrate-to-another-server workflow (export → transfer archive → import on destination)
