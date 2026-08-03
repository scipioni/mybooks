"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLibrarySelection } from "@/components/LibrarySelectionContext";

function Icon({ path, className = "h-4 w-4" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  tag: "M7 7h.01M3 11V5a2 2 0 012-2h6l10 10a2 2 0 010 2.83l-6.34 6.34a2 2 0 01-2.83 0L3 13V11z",
  status: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  star: "M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z",
  checklist: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  sort: "M3 7h13M3 12h9M3 17h5M17 4v16m0 0l-3-3m3 3l3-3",
  chevron: "M19 9l-7 7-7-7",
  close: "M6 18L18 6M6 6l12 12",
};

function FieldIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
      <Icon path={ICONS[name]} />
    </span>
  );
}

function Select({
  icon,
  value,
  onChange,
  children,
}: {
  icon: keyof typeof ICONS;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <FieldIcon name={icon} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-zinc-200 bg-white py-1.5 pl-8 pr-7 text-sm text-zinc-700 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
        <Icon path={ICONS.chevron} className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export default function LibraryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selected, clear, startReview } = useLibrarySelection();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [tag, setTag] = useState(searchParams.get("tag") ?? "");
  const status = searchParams.get("status") ?? "";
  const minRating = searchParams.get("minRating") ?? "";
  const metadata = searchParams.get("metadata") ?? "";
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = searchParams.get("order") ?? "desc";

  // Keep the text inputs in sync when the URL changes without this
  // component remounting — e.g. clicking an author name on a book card
  // navigates to /library?q=<author> on the same route, so useState's
  // initial value alone wouldn't otherwise pick up the new q.
  useEffect(() => {
    void Promise.resolve().then(() => {
      setQ(searchParams.get("q") ?? "");
      setTag(searchParams.get("tag") ?? "");
    });
  }, [searchParams]);

  const hasActiveFilters =
    q || tag || status || minRating || metadata || sort !== "createdAt" || order !== "desc";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-center gap-2">
      <div className="relative">
        <FieldIcon name="search" />
        <input
          placeholder="Search title/author/series"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-full border border-zinc-200 py-1.5 pl-8 pr-3 text-sm placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none"
        />
      </div>
      <div className="relative">
        <FieldIcon name="tag" />
        <input
          placeholder="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="w-28 rounded-full border border-zinc-200 py-1.5 pl-8 pr-3 text-sm placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none"
        />
      </div>

      <Select icon="status" value={status} onChange={(v) => updateParam("status", v)}>
        <option value="">All statuses</option>
        <option value="want-to-read">Want to read</option>
        <option value="reading">Reading</option>
        <option value="read">Read</option>
      </Select>

      <Select icon="star" value={minRating} onChange={(v) => updateParam("minRating", v)}>
        <option value="">Any rating</option>
        <option value="1">★☆☆☆☆ &amp; up</option>
        <option value="2">★★☆☆☆ &amp; up</option>
        <option value="3">★★★☆☆ &amp; up</option>
        <option value="4">★★★★☆ &amp; up</option>
        <option value="5">★★★★★</option>
      </Select>

      <Select icon="checklist" value={metadata} onChange={(v) => updateParam("metadata", v)}>
        <option value="">All books</option>
        <option value="incomplete">Incomplete metadata</option>
      </Select>

      <div className="flex items-center gap-1">
        <Select icon="sort" value={sort} onChange={(v) => updateParam("sort", v)}>
          <option value="createdAt">Date added</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
        </Select>
        <button
          type="button"
          onClick={() => updateParam("order", order === "desc" ? "asc" : "desc")}
          title={order === "desc" ? "Descending — click for ascending" : "Ascending — click for descending"}
          className="rounded-full border border-zinc-200 p-1.5 text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"
        >
          <Icon path={ICONS.sort} className={`h-4 w-4 transition-transform ${order === "asc" ? "-scale-y-100" : ""}`} />
        </button>
      </div>

      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        <Icon path={ICONS.search} className="h-3.5 w-3.5" />
        Search
      </button>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <Icon path={ICONS.close} className="h-3.5 w-3.5" />
          Clear
        </button>
      )}

      {selected.size > 0 && (
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-600">{selected.size} selected</span>
          <button
            type="button"
            onClick={startReview}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Normalize metadata
          </button>
          <button type="button" onClick={clear} className="text-sm text-zinc-500 hover:text-zinc-800">
            Clear selection
          </button>
        </div>
      )}
    </form>
  );
}
