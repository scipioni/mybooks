import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { handleAuthError, requireUser } from "@/lib/authz";
import { isValidEpub, parseEpub } from "@/lib/epub";
import { saveBookFile, saveCoverFile } from "@/lib/storage";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const tag = searchParams.get("tag")?.trim();
    const status = searchParams.get("status")?.trim();
    const minRating = Number(searchParams.get("minRating"));
    const sort = searchParams.get("sort") ?? "createdAt";
    const orderDir = searchParams.get("order") === "asc" ? asc : desc;

    const conditions = [eq(books.ownerId, user.id)];
    if (q) {
      conditions.push(
        or(
          like(books.title, `%${q}%`),
          like(books.author, `%${q}%`),
          like(books.seriesName, `%${q}%`)
        )!
      );
    }
    if (status === "want-to-read" || status === "reading" || status === "read") {
      conditions.push(eq(books.readingStatus, status));
    }
    if (minRating >= 1 && minRating <= 5) {
      conditions.push(gte(books.rating, minRating));
    }

    const sortColumn = sort === "title" ? books.title : sort === "author" ? books.author : books.createdAt;

    let rows = db
      .select()
      .from(books)
      .where(and(...conditions))
      .orderBy(orderDir(sortColumn))
      .all();

    if (tag) {
      rows = rows.filter((book) => {
        try {
          const tags = JSON.parse(book.tags || "[]") as string[];
          return tags.includes(tag);
        } catch {
          return false;
        }
      });
    }

    return NextResponse.json({ books: rows });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidEpub(buffer)) {
      return NextResponse.json({ error: "The uploaded file is not a valid EPUB" }, { status: 400 });
    }

    const bookId = randomUUID();

    let metadata: ReturnType<typeof parseEpub>;
    try {
      metadata = parseEpub(buffer);
    } catch {
      metadata = { title: null, author: null, language: null, isbn: null, coverBuffer: null, coverExt: null };
    }

    const filePath = saveBookFile(user.id, bookId, buffer);
    let coverPath: string | null = null;
    if (metadata.coverBuffer && metadata.coverExt) {
      coverPath = saveCoverFile(user.id, bookId, metadata.coverBuffer, metadata.coverExt);
    }

    const fallbackTitle = file.name.replace(/\.epub$/i, "");
    const book = {
      id: bookId,
      ownerId: user.id,
      title: metadata.title || fallbackTitle || "Untitled",
      author: metadata.author,
      seriesName: null,
      seriesPosition: null,
      tags: "[]",
      readingStatus: "want-to-read" as const,
      rating: null,
      coverPath,
      filePath,
      openLibraryId: null,
      language: metadata.language,
      isbn: metadata.isbn,
      publicationYear: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.insert(books).values(book).run();

    return NextResponse.json({ book }, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}
