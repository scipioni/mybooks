"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StarRating from "@/components/StarRating";
import MetadataReviewQueue from "@/components/MetadataReviewQueue";

interface BookCard {
  id: string;
  title: string;
  author: string | null;
  rating: number | null;
  updatedAt: Date;
  incomplete: boolean;
}

export default function LibraryGrid({ books }: { books: BookCard[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);

  function filterByAuthor(e: React.SyntheticEvent, author: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/library?q=${encodeURIComponent(author)}`);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  if (reviewing) {
    const queueBooks = books.filter((b) => selected.has(b.id));
    return (
      <MetadataReviewQueue
        books={queueBooks}
        onDone={() => {
          setReviewing(false);
          clearSelection();
        }}
      />
    );
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-zinc-600">{selected.size} selected</span>
          <button
            onClick={() => setReviewing(true)}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Normalize metadata
          </button>
          <button onClick={clearSelection} className="text-sm text-zinc-500 hover:text-zinc-800">
            Clear selection
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {books.map((book) => {
          const isSelected = selected.has(book.id);
          return (
            <Link key={book.id} href={`/library/${book.id}`} className="group relative">
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
              <div className="mt-1">
                <StarRating rating={book.rating} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
