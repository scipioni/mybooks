"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function LibraryPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefForPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <Link
        href={hrefForPage(page - 1)}
        aria-disabled={page <= 1}
        className={`rounded-full border border-zinc-200 px-3 py-1.5 ${
          page <= 1 ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:border-zinc-300"
        }`}
      >
        Previous
      </Link>
      <span className="text-zinc-500">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefForPage(page + 1)}
        aria-disabled={page >= totalPages}
        className={`rounded-full border border-zinc-200 px-3 py-1.5 ${
          page >= totalPages ? "pointer-events-none text-zinc-300" : "text-zinc-700 hover:border-zinc-300"
        }`}
      >
        Next
      </Link>
    </div>
  );
}
