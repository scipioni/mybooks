import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 450;

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
    const absThumbPath = thumbnailPathFor(absCoverPath);
    if (fs.existsSync(absThumbPath)) fs.unlinkSync(absThumbPath);
  }
}

function thumbnailPathFor(absCoverPath: string): string {
  const dir = path.dirname(absCoverPath);
  const ext = path.extname(absCoverPath);
  const base = path.basename(absCoverPath, ext);
  // Thumbnails are always re-encoded as JPEG regardless of the original format.
  return path.join(dir, `${base}-thumb.jpg`);
}

/**
 * Returns the absolute path to a resized (300x450) version of the cover at
 * `absCoverPath`, generating and caching it to disk on first call. Reused on
 * subsequent calls so resizing only happens once per cover.
 */
export async function getOrCreateCoverThumbnail(absCoverPath: string): Promise<string> {
  const absThumbPath = thumbnailPathFor(absCoverPath);
  if (fs.existsSync(absThumbPath)) {
    const [coverStat, thumbStat] = [fs.statSync(absCoverPath), fs.statSync(absThumbPath)];
    if (thumbStat.mtimeMs >= coverStat.mtimeMs) return absThumbPath;
  }
  const buffer = await sharp(absCoverPath)
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  fs.writeFileSync(absThumbPath, buffer);
  return absThumbPath;
}
