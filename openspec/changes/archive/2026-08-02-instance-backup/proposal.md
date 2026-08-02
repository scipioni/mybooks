## Why

Self-hosted deployments need a way to move to another server (hardware change, hosting migration) without losing the database or users' book files, and a way to recover from operator error. There was no export/import mechanism at all.

## What Changes

- Add a full-instance export: a single timestamped archive containing the SQLite database (safely captured via online-backup, not a raw file copy, since the database can be in WAL mode with unflushed writes) and the entire per-user book/cover storage tree.
- Add a full-instance restore from that archive, refusing to overwrite an existing non-empty database unless explicitly forced.
- Expose both as `task` commands for local/bare-metal deployments and as Docker-native equivalents that operate against the named volumes without requiring the app container to be running.
- Document the migrate-to-another-server workflow (export → transfer the archive → import on the destination) in the README.

This is an operational/admin capability (CLI-driven), not a new in-app UI feature — it's meant for whoever manages the deployment, not end users of the library itself.

## Capabilities

### New Capabilities
- `instance-backup`: Exporting and restoring a full instance (database + book files) for backup and server migration.

### Modified Capabilities
- None.

## Impact

- **New files**: `scripts/backup-export.sh`, `scripts/backup-restore.sh`, `scripts/backup-db.cjs` (safe SQLite snapshot via `better-sqlite3`'s online-backup API).
- **Taskfile**: `backup:export`, `backup:import`, `docker:backup:export`, `docker:backup:import`.
- **Docker**: new `./backups:/backup` bind mount in `docker-compose.yml`; `scripts/` copied into the runtime image.
- **No data model changes** — this operates on the existing database file and book storage tree as opaque artifacts.
