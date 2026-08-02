import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

function baseDir(): string {
  return path.resolve(process.cwd(), env.BOOKS_STORAGE_PATH || "./data/books");
}

export function userDir(userId: string): string {
  return path.join(baseDir(), userId);
}

export function bookFilePath(userId: string, bookId: string): string {
  return path.join(userDir(userId), `${bookId}.epub`);
}

export function bookCoverPath(userId: string, bookId: string, ext: string): string {
  return path.join(userDir(userId), `${bookId}-cover.${ext}`);
}

function ensureUserDir(userId: string): void {
  fs.mkdirSync(userDir(userId), { recursive: true });
}

export function saveBookFile(userId: string, bookId: string, buffer: Buffer): string {
  ensureUserDir(userId);
  const filePath = bookFilePath(userId, bookId);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function saveCoverFile(userId: string, bookId: string, buffer: Buffer, ext: string): string {
  ensureUserDir(userId);
  const coverPath = bookCoverPath(userId, bookId, ext);
  fs.writeFileSync(coverPath, buffer);
  return coverPath;
}

export function deleteBookFiles(filePath: string, coverPath: string | null): void {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (coverPath && fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
}
