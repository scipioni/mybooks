#!/usr/bin/env bash
# Restores a full mybooks instance backup produced by backup-export.sh.
#
# Usage: scripts/backup-restore.sh <archive.tar.gz> [--force]
#
# Refuses to overwrite an existing, non-empty database unless --force is
# passed, since restore is destructive (it replaces the current DB file and
# entirely replaces the books storage directory).
set -euo pipefail

ARCHIVE="${1:?Usage: scripts/backup-restore.sh <archive.tar.gz> [--force]}"
FORCE="${2:-}"

if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DB_PATH="${DATABASE_PATH:-./data/mybooks.db}"
BOOKS_PATH="${BOOKS_STORAGE_PATH:-./data/books}"

if [ -s "$DB_PATH" ] && [ "$FORCE" != "--force" ]; then
  echo "Refusing to overwrite existing, non-empty database at $DB_PATH without --force." >&2
  echo "Re-run: task backup:import -- $ARCHIVE --force" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
tar -xzf "$ARCHIVE" -C "$WORKDIR"

if [ ! -f "$WORKDIR/manifest.json" ]; then
  echo "Invalid backup archive: missing manifest.json" >&2
  exit 1
fi

DB_FILENAME="$(sed -n 's/.*"dbFilename": *"\([^"]*\)".*/\1/p' "$WORKDIR/manifest.json")"
DB_FILENAME="${DB_FILENAME:-mybooks.db}"

if [ ! -f "$WORKDIR/db/$DB_FILENAME" ]; then
  echo "Invalid backup archive: missing db/$DB_FILENAME" >&2
  exit 1
fi

mkdir -p "$(dirname "$DB_PATH")"
cp "$WORKDIR/db/$DB_FILENAME" "$DB_PATH"

rm -rf "$BOOKS_PATH"
mkdir -p "$BOOKS_PATH"
cp -r "$WORKDIR/books/." "$BOOKS_PATH/"

echo "Restored database to $DB_PATH and books to $BOOKS_PATH."
echo "Restart the app for the restored data to take effect."
