import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { env } from "@/lib/env";
import * as schema from "./schema";

const resolvedDbPath = path.resolve(process.cwd(), env.DATABASE_PATH || "./data/mybooks.db");
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

const sqlite = new Database(resolvedDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Apply migrations automatically on startup so a container restart with an
// empty/older volume ends up schema-current without a manual migration step.
// Skipped during `next build`'s page-data collection phase, which loads
// this module concurrently across many workers against the same sqlite
// file and would otherwise race to apply the same migration twice.
const migrationsFolder = path.resolve(process.cwd(), "drizzle");
if (process.env.NEXT_PHASE !== "phase-production-build" && fs.existsSync(migrationsFolder)) {
  migrate(db, { migrationsFolder });
}
