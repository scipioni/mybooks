"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OpenLibraryCandidate } from "@/lib/openlibrary";
import CandidateCover from "@/components/CandidateCover";

export default function OpenLibrarySearch({
  bookId,
  defaultQuery,
  isbn,
  defaultLanguage,
}: {
  bookId: string;
  defaultQuery: string;
  isbn?: string | null;
  defaultLanguage?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [language, setLanguage] = useState(defaultLanguage ?? "");
  const [candidates, setCandidates] = useState<OpenLibraryCandidate[] | null>(null);
  const [sourceErrors, setSourceErrors] = useState<{ google?: boolean; openLibrary?: boolean }>({});
  const [searching, setSearching] = useState(false);
  const [searchedByIsbn, setSearchedByIsbn] = useState(false);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipCover, setSkipCover] = useState(false);

  async function runSearch(url: string, byIsbn: boolean) {
    setSearching(true);
    setError(null);
    setCandidates(null);
    setSourceErrors({});
    setSearchedByIsbn(byIsbn);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        return;
      }
      setCandidates(data.candidates);
      setSourceErrors(data.sourceErrors ?? {});
    } catch {
      setError("Search failed");
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ q: query });
    if (language) params.set("language", language);
    runSearch(`/api/books/${bookId}/openlibrary/search?${params.toString()}`, false);
  }

  function handleSearchByIsbn() {
    if (!isbn) return;
    runSearch(`/api/books/${bookId}/openlibrary/search?isbn=${encodeURIComponent(isbn)}`, true);
  }

  async function handleApply(key: string) {
    setApplyingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/openlibrary/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, skipCover }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to apply candidate");
        return;
      }
      setOpen(false);
      setCandidates(null);
      router.refresh();
    } catch {
      setError("Failed to apply candidate");
    } finally {
      setApplyingKey(null);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100"
      >
        Look up on Open Library
      </button>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Open Library lookup</h3>
        <button
          onClick={() => {
            setOpen(false);
            setCandidates(null);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-800"
        >
          Skip / close
        </button>
      </div>
      <form onSubmit={handleSearch} className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="lang (e.g. it)"
          title="Narrow to a specific edition language, e.g. 'it'. Only filters among editions that already match the title text above."
          className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>
      {isbn && (
        <button
          type="button"
          onClick={handleSearchByIsbn}
          disabled={searching}
          className="mb-3 rounded-md border border-zinc-300 px-3 py-2 text-xs hover:bg-zinc-100 disabled:opacity-50"
        >
          Search by ISBN ({isbn}) — exact match
        </button>
      )}
      <label className="mb-3 flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={skipCover}
          onChange={(e) => setSkipCover(e.target.checked)}
        />
        Skip cover image replacement
      </label>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      {(sourceErrors.google || sourceErrors.openLibrary) && (
        <p className="mb-2 text-xs text-amber-700">
          {sourceErrors.google && sourceErrors.openLibrary
            ? "Both Google Books and Open Library failed to respond (rate limit or outage) — try again shortly."
            : sourceErrors.google
              ? "Google Books failed to respond (rate limit or outage) — results below are Open Library only."
              : "Open Library failed to respond — results below are Google Books only."}
        </p>
      )}
      {candidates && candidates.length === 0 && (
        <div className="text-sm text-zinc-500">
          <p>No candidates found (checked Open Library and Google Books). Existing metadata is unchanged.</p>
          {!searchedByIsbn && (
            <p className="mt-1 text-xs">
              Translated edition? Free-text search is title-based and often
              won&apos;t match a non-English title.{" "}
              {isbn
                ? "Try the ISBN search above for an exact match."
                : "Try searching the book's original-language title instead."}
            </p>
          )}
        </div>
      )}
      {candidates && candidates.length > 0 && (
        <ul className="space-y-2">
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
                {c.languages.length > 0 && (
                  <p className="text-xs text-zinc-400">Available in: {c.languages.join(", ")}</p>
                )}
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
        </ul>
      )}
    </div>
  );
}
