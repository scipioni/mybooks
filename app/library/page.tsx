import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, like, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import UploadForm from "@/components/UploadForm";
import LibraryFilters from "@/components/LibraryFilters";
import LibraryGrid from "@/components/LibraryGrid";
import { isMetadataIncomplete } from "@/lib/bookMetadata";
import { getAverageRatingsByIsbn } from "@/lib/reviews";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LibraryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tag = typeof sp.tag === "string" ? sp.tag.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const minRating = typeof sp.minRating === "string" ? Number(sp.minRating) : 0;
  const sort = typeof sp.sort === "string" ? sp.sort : "createdAt";
  const orderDir = sp.order === "asc" ? asc : desc;

  const conditions = [eq(books.ownerId, session.user.id)];
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

  const metadataFilter = typeof sp.metadata === "string" ? sp.metadata : "";
  if (metadataFilter === "incomplete") {
    rows = rows.filter(isMetadataIncomplete);
  }

  const isbns = rows.map((b) => b.isbn).filter((isbn): isbn is string => Boolean(isbn));
  const avgRatings = getAverageRatingsByIsbn(isbns);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <UploadForm />
      </div>
      <LibraryFilters />
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No books yet — upload an EPUB to get started.</p>
      ) : (
        <LibraryGrid
          books={rows.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            rating: b.rating,
            avgRating: b.isbn ? (avgRatings.get(b.isbn)?.avgRating ?? null) : null,
            updatedAt: b.updatedAt,
            incomplete: isMetadataIncomplete(b),
          }))}
        />
      )}
    </div>
  );
}
