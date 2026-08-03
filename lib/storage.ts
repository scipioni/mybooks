import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

function baseDir(): string {
  return path.resolve(process.cwd(), env.BOOKS_STORAGE_PATH || "./data/books");
}

export function userDir(userId: string): string {
  return path.join(baseDir(), userId);
}

/**
 * `filePath`/`coverPath` are stored in the DB relative to `baseDir()`, not as
 * absolute paths — an absolute path baked in at upload time would go stale
 * if the app's working directory ever moves (e.g. the deployment is
 * reinstalled at a different path). Resolve to an absolute path only at the
 * point of use.
 */
export function resolveStoragePath(relativePath: string): string {
  return path.join(baseDir(), relativePath);
}

function relativeBookFilePath(userId: string, bookId: string): string {
  return path.join(userId, `${bookId}.epub`);
}

function relativeBookCoverPath(userId: string, bookId: string, ext: string): string {
  return path.join(userId, `${bookId}-cover.${ext}`);
}

function ensureUserDir(userId: string): void {
  fs.mkdirSync(userDir(userId), { recursive: true });
}

export function saveBookFile(userId: string, bookId: string, buffer: Buffer): string {
  ensureUserDir(userId);
  const relativePath = relativeBookFilePath(userId, bookId);
  fs.writeFileSync(resolveStoragePath(relativePath), buffer);
  return relativePath;
}

export function saveCoverFile(userId: string, bookId: string, buffer: Buffer, ext: string): string {
  ensureUserDir(userId);
  // Remove any previously saved cover for this book under a different
  // extension (e.g. the EPUB's own cover was .jpeg, then a normalized
  // metadata apply saved a .jpg) so it doesn't linger as an orphan file.
  const dir = userDir(userId);
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(`${bookId}-cover.`) && entry !== `${bookId}-cover.${ext}`) {
      fs.unlinkSync(path.join(dir, entry));
    }
  }
  const relativePath = relativeBookCoverPath(userId, bookId, ext);
  fs.writeFileSync(resolveStoragePath(relativePath), buffer);
  return relativePath;
}

export function deleteBookFiles(filePath: string, coverPath: string | null): void {
  const absFilePath = resolveStoragePath(filePath);
  if (fs.existsSync(absFilePath)) fs.unlinkSync(absFilePath);
  if (coverPath) {
    const absCoverPath = resolveStoragePath(coverPath);
    if (fs.existsSync(absCoverPath)) fs.unlinkSync(absCoverPath);
  }
}
