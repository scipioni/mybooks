#!/usr/bin/env node
// Safely snapshots a SQLite database (including any data still sitting in
// the -wal file, not yet checkpointed into the main file) into a single
// consistent file, using better-sqlite3's online-backup API. A plain `cp`
// of the .db file alone can silently miss recent writes in WAL mode.
//
// Usage: node scripts/backup-db.cjs <source.db> <dest.db>
const Database = require("better-sqlite3");

const [, , srcPath, destPath] = process.argv;
if (!srcPath || !destPath) {
  console.error("Usage: backup-db.cjs <source.db> <dest.db>");
  process.exit(1);
}

const db = new Database(srcPath, { readonly: true, fileMustExist: true });
db.backup(destPath)
  .then(() => db.close())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
