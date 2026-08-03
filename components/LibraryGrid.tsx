"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StarRating from "@/components/StarRating";
import MetadataReviewQueue from "@/components/MetadataReviewQueue";
import { useLibrarySelection } from "@/components/LibrarySelectionContext";

interface BookCard {
  id: string;
  title: string;
  author: string | null;
  rating: number | null;
  avgRating: number | null;
  updatedAt: Date;
  incomplete: boolean;
  hasExternalLink: boolean;
  tags: string[];
  readingStatus: "want-to-read" | "reading" | "read";
}

export default function LibraryGrid({ books }: { books: BookCard[] }) {
  const router = useRouter();
  const { selected, toggle, reviewing, stopReview } = useLibrarySelection();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function filterByAuthor(e: React.SyntheticEvent, author: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/library?q=${encodeURIComponent(author)}`);
  }

  function filterByTag(e: React.SyntheticEvent, tag: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/library?tag=${encodeURIComponent(tag)}`);
  }

  async function openExternalLink(e: React.SyntheticEvent, bookId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (resolvingId) return;
    setResolvingId(bookId);
    try {
      const res = await fetch(`/api/books/${bookId}/google-books-link`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.link) {
        window.open(data.link, "_blank", "noopener,noreferrer");
      }
    } finally {
      setResolvingId(null);
    }
  }

  if (reviewing) {
    const queueBooks = books.filter((b) => selected.has(b.id));
    return <MetadataReviewQueue books={queueBooks} onDone={stopReview} />;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {books.map((book) => {
          const isSelected = selected.has(book.id);
          return (
            <Link key={book.id} href={`/library/${book.id}`} className="group relative">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(book.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-1 top-1 z-10 h-4 w-4"
                  aria-label={`Select ${book.title}`}
                />
                {book.incomplete && (
                  <span
                    title="Incomplete metadata — missing author, cover, language, ISBN, or publication year"
                    className="absolute right-1 top-1 z-10 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 shadow"
                  >
                    ⚠ Incomplete
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/books/${book.id}/cover?v=${book.updatedAt.getTime()}`}
                  alt={book.title}
                  className={`aspect-[2/3] w-full rounded-md border object-cover ${
                    isSelected ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200 bg-white"
                  }`}
                />
                {book.readingStatus === "read" && (
                  <span
                    title="You've marked this book as read"
                    className="absolute bottom-1 left-1 z-10 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
                  >
                    ✓ Read
                  </span>
                )}
                {book.hasExternalLink && (
                  <button
                    type="button"
                    onClick={(e) => openExternalLink(e, book.id)}
                    disabled={resolvingId === book.id}
                    title="View on Open Library / Google Books"
                    aria-label={`View ${book.title} on Open Library or Google Books`}
                    className="absolute bottom-1 right-1 z-10 rounded-full bg-white/90 p-1.5 text-zinc-600 shadow hover:text-zinc-900 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 3h7v7m0-7L10 14M5 5h5v0H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium group-hover:underline">{book.title}</p>
              {book.author && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => filterByAuthor(e, book.author!)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") filterByAuthor(e, book.author!);
                  }}
                  title={`Show books by ${book.author}`}
                  className="block truncate text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
                >
                  {book.author}
                </span>
              )}
              <div className="mt-1 flex items-center gap-1">
                <StarRating rating={book.avgRating != null ? Math.round(book.avgRating) : book.rating} />
                {book.avgRating != null && (
                  <span className="text-[10px] text-zinc-400" title="Average across all reviews for this ISBN">
                    {book.avgRating.toFixed(1)}
                  </span>
                )}
              </div>
              {book.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {book.tags.map((tag) => (
                    <span
                      key={tag}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => filterByTag(e, tag)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") filterByTag(e, tag);
                      }}
                      title={`Show books tagged ${tag}`}
                      className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
