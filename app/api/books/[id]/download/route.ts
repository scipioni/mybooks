import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { handleAuthError, requireUser } from "@/lib/authz";
import { getBookOrThrow } from "@/lib/books";
import { resolveStoragePath } from "@/lib/storage";

/** "Author - Title.epub", stripped of characters that are unsafe in filenames. */
function downloadFileName(title: string, author: string | null): string {
  const base = (author ? `${author} - ${title}` : title)
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return `${base || "book"}.epub`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);

    const absFilePath = resolveStoragePath(book.filePath);
    if (!fs.existsSync(absFilePath)) {
      return NextResponse.json({ error: "Book file not found" }, { status: 404 });
    }

    const fileName = downloadFileName(book.title, book.author);
    // Plain `filename` must be ASCII; `filename*` carries the full UTF-8 name.
    const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_");
    const { size } = fs.statSync(absFilePath);
    const stream = Readable.toWeb(fs.createReadStream(absFilePath)) as ReadableStream<Uint8Array>;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
