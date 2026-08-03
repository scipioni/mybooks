"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/db/schema";
import StarRatingInput from "@/components/StarRatingInput";
import TagInput from "@/components/TagInput";

export default function EditBookForm({ book }: { book: Book }) {
  const router = useRouter();
  const initialTags = (() => {
    try {
      return JSON.parse(book.tags || "[]") as string[];
    } catch {
      return [];
    }
  })();

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [seriesName, setSeriesName] = useState(book.seriesName ?? "");
  const [seriesPosition, setSeriesPosition] = useState(
    book.seriesPosition != null ? String(book.seriesPosition) : ""
  );
  const [tags, setTags] = useState(initialTags);
  const [readingStatus, setReadingStatus] = useState(book.readingStatus);
  const [rating, setRating] = useState<number | null>(book.rating);
  const [language, setLanguage] = useState(book.language ?? "");
  const [isbn, setIsbn] = useState(book.isbn ?? "");
  const [publicationYear, setPublicationYear] = useState(
    book.publicationYear != null ? String(book.publicationYear) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author: author || null,
          seriesName: seriesName || null,
          seriesPosition: seriesPosition ? Number(seriesPosition) : null,
          tags,
          readingStatus,
          rating,
          language: language.trim() || null,
          isbn: isbn.trim() || null,
          publicationYear: publicationYear ? Number(publicationYear) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save changes");
        return;
      }
      router.push("/library");
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-zinc-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="col-span-2 text-sm">
          Author
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Series name
          <input
            value={seriesName}
            onChange={(e) => setSeriesName(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Series position
          <input
            type="number"
            value={seriesPosition}
            onChange={(e) => setSeriesPosition(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="col-span-2 text-sm">
          Tags
          <TagInput value={tags} onChange={setTags} />
        </label>
        <label className="text-sm">
          Reading status
          <select
            value={readingStatus}
            onChange={(e) => setReadingStatus(e.target.value as typeof readingStatus)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="want-to-read">Want to read</option>
            <option value="reading">Reading</option>
            <option value="read">Read</option>
          </select>
        </label>
        <div className="text-sm">
          Rating
          <StarRatingInput value={rating} onChange={setRating} />
        </div>
        <label className="text-sm">
          Language (e.g. it, en)
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          ISBN
          <input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Publication year
          <input
            type="number"
            value={publicationYear}
            onChange={(e) => setPublicationYear(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
