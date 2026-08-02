import { env } from "@/lib/env";
import type { OpenLibraryCandidate, OpenLibraryDetails } from "@/lib/openlibrary";

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GBVolume = Record<string, any>;

function withApiKey(url: URL): URL {
  if (env.GOOGLE_BOOKS_API_KEY) url.searchParams.set("key", env.GOOGLE_BOOKS_API_KEY);
  return url;
}

/**
 * Google Books' search endpoint (unlike direct volume-by-ID lookups) is
 * observed to fail transiently at a high rate — roughly half of requests
 * return 503 "backendFailed" even with valid auth and no quota exhausted.
 * Retrying a couple of times with a short backoff turns that into a much
 * smaller residual failure rate. Only retries on 5xx/429 (server-side/rate
 * issues) — a 4xx like 404 means the resource genuinely doesn't exist and
 * won't be fixed by trying again.
 */
async function fetchWithRetry(url: string, retries = 2, delayMs = 400): Promise<Response> {
  let lastRes: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    lastRes = res;
    const transient = res.status >= 500 || res.status === 429;
    if (!transient || attempt === retries) return res;
    await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
  }
  return lastRes!;
}

/**
 * Fallback metadata source, tried only when Open Library returns nothing.
 * Google's library-scanning partnerships tend to cover non-English/translated
 * editions (e.g. Italian) that Open Library's catalog is missing.
 *
 * @param language Optional 2-letter code (e.g. "it"); Google Books' own
 * `langRestrict` param already uses this format, unlike Open Library's
 * internal 3-letter codes — no mapping needed here.
 */
export async function searchGoogleBooks(query: string, language?: string): Promise<OpenLibraryCandidate[]> {
  const url = withApiKey(new URL(GOOGLE_BOOKS_API));
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "10");
  if (language) url.searchParams.set("langRestrict", language.toLowerCase());

  const res = await fetchWithRetry(url.toString());
  if (!res.ok) {
    throw new Error(`Google Books search failed with status ${res.status}`);
  }
  const data = (await res.json()) as { items?: GBVolume[] };
  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((item) => {
    const v = item.volumeInfo ?? {};
    return {
      key: `google:${item.id}`,
      title: typeof v.title === "string" ? v.title : "Untitled",
      author: Array.isArray(v.authors) ? v.authors.join(", ") : null,
      firstPublishYear: extractYear(v.publishedDate),
      coverUrl: normalizeThumbnail(v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail, 300),
      languages: typeof v.language === "string" ? [v.language.toLowerCase()] : [],
      source: "google" as const,
    };
  });
}

/**
 * Re-fetches full volume details server-side on explicit user confirmation,
 * matching the same "never trust client-supplied metadata" guarantee as
 * fetchOpenLibraryDetails.
 */
export async function fetchGoogleBooksDetails(key: string): Promise<OpenLibraryDetails> {
  const id = key.replace(/^google:/, "");
  const url = withApiKey(new URL(`${GOOGLE_BOOKS_API}/${encodeURIComponent(id)}`));

  const res = await fetchWithRetry(url.toString());
  if (!res.ok) {
    throw new Error(`Google Books lookup failed with status ${res.status}`);
  }
  const data = (await res.json()) as GBVolume;
  const v = data.volumeInfo ?? {};

  let coverBuffer: Buffer | null = null;
  let coverExt: string | null = null;
  // Google's default thumbnail is tiny (128x192) — this is the cover that
  // actually gets saved permanently for the book, so request a much larger
  // rendition of the same image via the documented `w=` override (capped
  // sensibly by Google at the source scan's real max resolution, doesn't
  // upscale artificially).
  const thumb = normalizeThumbnail(v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail, 1000);
  if (thumb) {
    try {
      const coverRes = await fetch(thumb);
      if (coverRes.ok) {
        coverBuffer = Buffer.from(await coverRes.arrayBuffer());
        coverExt = "jpg";
      }
    } catch {
      // Cover fetch is best-effort; the metadata apply still proceeds without it.
    }
  }

  return {
    key: `google:${id}`,
    title: typeof v.title === "string" ? v.title : "",
    author: Array.isArray(v.authors) ? v.authors.join(", ") : null,
    language: typeof v.language === "string" ? v.language.toLowerCase() : null,
    isbn: extractIsbn(v.industryIdentifiers),
    publicationYear: extractYear(v.publishedDate),
    coverBuffer,
    coverExt,
  };
}

function normalizeThumbnail(url: string | undefined, width: number): string | null {
  if (!url) return null;
  // Google Books returns http:// thumbnail URLs; force https to avoid
  // mixed-content issues when the app itself is served over https. The
  // default thumbnail/smallThumbnail links are small fixed sizes (~128px
  // wide); overriding `w` requests a larger rendition of the same cover
  // image, and dropping `edge=curl` removes the decorative page-curl corner.
  const normalized = new URL(url.replace(/^http:/, "https:"));
  normalized.searchParams.delete("edge");
  normalized.searchParams.set("w", String(width));
  return normalized.toString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractIsbn(industryIdentifiers: any): string | null {
  if (!Array.isArray(industryIdentifiers)) return null;
  const isbn13 = industryIdentifiers.find((i) => i?.type === "ISBN_13")?.identifier;
  const isbn10 = industryIdentifiers.find((i) => i?.type === "ISBN_10")?.identifier;
  const value = isbn13 ?? isbn10;
  return typeof value === "string" ? value.replace(/[-\s]/g, "") : null;
}

// Google Books' publishedDate is often just a year ("1997") but can be a
// full date ("1997-06-26"); pull out the first 4-digit year we find.
function extractYear(publishedDate: unknown): number | null {
  if (typeof publishedDate !== "string") return null;
  const match = publishedDate.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}
