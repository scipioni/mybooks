import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books, devices } from "@/lib/db/schema";
import EditBookForm from "@/components/EditBookForm";
import OpenLibrarySearch from "@/components/OpenLibrarySearch";
import SendToDeviceButton from "@/components/SendToDeviceButton";
import DeleteBookButton from "@/components/DeleteBookButton";
import StarRating from "@/components/StarRating";
import ReviewSection from "@/components/ReviewSection";
import { getAverageRatingsByIsbn } from "@/lib/reviews";

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const book = db.select().from(books).where(eq(books.id, id)).get();
  if (!book) {
    notFound();
  }

  const userDevices = db
    .select()
    .from(devices)
    .where(eq(devices.userId, session.user.id))
    .orderBy(desc(devices.createdAt))
    .all();

  const avgRating = book.isbn ? (getAverageRatingsByIsbn([book.isbn]).get(book.isbn)?.avgRating ?? null) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/library"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
      >
        ← Back to library
      </Link>
      <div className="mb-6 flex gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/books/${book.id}/cover?v=${book.updatedAt.getTime()}`}
          alt={book.title}
          className="aspect-[2/3] w-40 flex-none rounded-md border border-zinc-200 bg-white object-cover"
        />
        <div>
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          {book.author && <p className="text-zinc-600">{book.author}</p>}
          {book.seriesName && (
            <p className="text-sm text-zinc-500">
              {book.seriesName}
              {book.seriesPosition != null ? ` #${book.seriesPosition}` : ""}
            </p>
          )}
          {book.openLibraryId && (
            <p className="mt-1 text-xs text-zinc-400">Open Library: {book.openLibraryId}</p>
          )}
          {(book.language || book.isbn || book.publicationYear) && (
            <p className="mt-1 text-xs text-zinc-400">
              {[
                book.language?.toUpperCase(),
                book.publicationYear ? String(book.publicationYear) : null,
                book.isbn ? `ISBN ${book.isbn}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={avgRating != null ? Math.round(avgRating) : book.rating} size="md" />
            {avgRating != null && (
              <span className="text-xs text-zinc-400" title="Average across all reviews for this ISBN">
                {avgRating.toFixed(1)} avg
              </span>
            )}
          </div>
          {book.ownerId === session.user.id && (
            <div className="mt-4">
              <DeleteBookButton bookId={book.id} />
            </div>
          )}
        </div>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">Edit details</h2>
        <EditBookForm key={book.updatedAt.getTime()} book={book} />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">Open Library metadata</h2>
        <OpenLibrarySearch
          bookId={book.id}
          defaultQuery={book.title}
          isbn={book.isbn}
          defaultLanguage={book.language}
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-medium">Reviews</h2>
        <ReviewSection bookId={book.id} isbn={book.isbn} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Send to device</h2>
        <SendToDeviceButton bookId={book.id} devices={userDevices} />
      </section>
    </div>
  );
}
