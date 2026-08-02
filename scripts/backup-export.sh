#!/usr/bin/env bash
# Exports the full mybooks instance (SQLite database + all book files) into a
# single timestamped tar.gz archive, for migrating to another server.
#
# Usage: scripts/backup-export.sh [output-dir]   (default: ./backups)
#
# Reads DATABASE_PATH / BOOKS_STORAGE_PATH from .env (falling back to the
# same defaults as .env.example) so this works against a local/bare-metal
# deployment. For Docker deployments, use `task docker:backup:export`
# instead, which reads directly from the named volumes.
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DB_PATH="${DATABASE_PATH:-./data/mybooks.db}"
BOOKS_PATH="${BOOKS_STORAGE_PATH:-./data/books}"
OUT_DIR="${1:-./backups}"

if [ ! -f "$DB_PATH" ]; then
  echo "Database file not found at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$OUT_DIR/mybooks-backup-$TS.tar.gz"
DB_FILENAME="$(basename "$DB_PATH")"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

mkdir -p "$WORKDIR/db"
# Uses better-sqlite3's online-backup API rather than a plain `cp`: SQLite
# runs in WAL mode, so recent writes can sit in the .db-wal sidecar file and
# a raw file copy would silently miss them.
node "$(dirname "$0")/backup-db.cjs" "$DB_PATH" "$WORKDIR/db/$DB_FILENAME"

mkdir -p "$WORKDIR/books"
if [ -d "$BOOKS_PATH" ]; then
  cp -r "$BOOKS_PATH/." "$WORKDIR/books/"
fi

cat > "$WORKDIR/manifest.json" <<EOF
{
  "exportedAt": "$TS",
  "dbFilename": "$DB_FILENAME"
}
EOF

tar -czf "$ARCHIVE" -C "$WORKDIR" manifest.json db books

echo "Backup written to $ARCHIVE"
