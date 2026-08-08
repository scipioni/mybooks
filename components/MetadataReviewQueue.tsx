"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpenLibraryCandidate } from "@/lib/openlibrary";
import CandidateCover from "@/components/CandidateCover";

interface BookSummary {
  id: string;
  title: string;
  author: string | null;
}

/** Steps through a pre-selected list of books one at a time, searching and
 * presenting candidates to confirm or skip — nothing is applied automatically. */
export default function MetadataReviewQueue({
  books,
  onDone,
}: {
  books: BookSummary[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [candidates, setCandidates] = useState<OpenLibraryCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipCover, setSkipCover] = useState(false);

  async function searchCurrent(book: BookSummary) {
    setLoading(true);
    setError(null);
    setCandidates(null);
    try {
      const url = `/api/books/${book.id}/openlibrary/search?q=${encodeURIComponent(book.title)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        return;
      }
      setCandidates(data.candidates);
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (books[0]) searchCurrent(books[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance() {
    const nextIndex = index + 1;
    if (nextIndex >= books.length) {
      finish();
      return;
    }
    setIndex(nextIndex);
    await searchCurrent(books[nextIndex]);
  }

  function finish() {
    router.refresh();
    onDone();
  }

  async function handleApply(key: string) {
    const book = books[index];
    setApplyingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/books/${book.id}/openlibrary/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, skipCover }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to apply candidate");
        return;
      }
      await advance();
    } catch {
      setError("Failed to apply candidate");
    } finally {
      setApplyingKey(null);
    }
  }

  const current = books[index];

  return (
    <div className="mb-6 rounded-md border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Reviewing {index + 1} of {books.length}: {current.title}
        </h3>
        <button onClick={finish} className="text-xs text-zinc-500 hover:text-zinc-800">
          Stop
        </button>
      </div>
      <label className="mb-3 flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={skipCover}
          onChange={(e) => setSkipCover(e.target.checked)}
        />
        Skip cover image replacement
      </label>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-zinc-500">Searching…</p>}
      {!loading && candidates && candidates.length === 0 && (
        <div className="mb-3 text-sm text-zinc-500">
          <p>No candidates found for &quot;{current.title}&quot;.</p>
          <button
            onClick={advance}
            className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100"
          >
            Skip to next
          </button>
        </div>
      )}
      {!loading && candidates && candidates.length > 0 && (
        <ul className="mb-3 space-y-2">
          {candidates.map((c) => (
            <li key={c.key} className="flex items-center gap-3 rounded-md border border-zinc-100 p-2">
              <CandidateCover url={c.coverUrl} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {c.title}
                  {c.source === "google" && (
                    <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">
                      Google Books
                    </span>
                  )}
                </p>
                <p className="text-zinc-500">
                  {c.author ?? "Unknown author"}
                  {c.firstPublishYear ? ` · ${c.firstPublishYear}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleApply(c.key)}
                disabled={applyingKey === c.key}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-50"
              >
                {applyingKey === c.key ? "Applying..." : "Use this"}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={advance}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100"
            >
              Skip to next
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
