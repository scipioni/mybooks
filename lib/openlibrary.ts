import { env } from "@/lib/env";

// Open Library asks API consumers to identify themselves via User-Agent for
// a higher rate limit (1 req/s anonymous vs 3 req/s identified). Reuses
// ADMIN_EMAIL (already configured per deployment) rather than hardcoding a
// personal address in source.
const OL_USER_AGENT = `mybooks/1.0 (${env.ADMIN_EMAIL || "no-contact-configured"})`;

function olFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), "User-Agent": OL_USER_AGENT },
  });
}

export type MetadataSource = "openlibrary" | "google";

export interface OpenLibraryCandidate {
  key: string;
  title: string;
  author: string | null;
  firstPublishYear: number | null;
  coverUrl: string | null;
  languages: string[];
  source: MetadataSource;
}

export interface OpenLibraryDetails {
  key: string;
  title: string;
  author: string | null;
  language: string | null;
  isbn: string | null;
  publicationYear: number | null;
  coverBuffer: Buffer | null;
  coverExt: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OLDoc = Record<string, any>;

/**
 * @param language Optional 2-letter code (e.g. "it") to narrow results to a
 * specific edition language, using Solr's `language:xxx` field-scoped query
 * syntax (Open Library's own 3-letter codes internally). This *narrows*
 * results among editions that already match the title text — it doesn't
 * help find a translated title that isn't indexed under that text at all
 * (see searchOpenLibraryByIsbn for that case).
 */
export async function searchOpenLibrary(query: string, language?: string): Promise<OpenLibraryCandidate[]> {
  const url = new URL("https://openlibrary.org/search.json");
  const olLanguage = language ? (REVERSE_LANGUAGE_MAP[language.toLowerCase()] ?? language.toLowerCase()) : null;
  url.searchParams.set("q", olLanguage ? `${query} language:${olLanguage}` : query);
  url.searchParams.set("limit", "10");

  const res = await olFetch(url.toString());
  if (!res.ok) {
    throw new Error(`Open Library search failed with status ${res.status}`);
  }
  const data = (await res.json()) as { docs?: OLDoc[] };
  const docs = Array.isArray(data.docs) ? data.docs : [];

  return docs.map((doc) => ({
    key: String(doc.key),
    title: String(doc.title ?? "Untitled"),
    author: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : null,
    firstPublishYear: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    languages: mapLanguageList(doc.language),
    source: "openlibrary" as const,
  }));
}

/**
 * Direct ISBN lookup. Unlike free-text search, this is exact and
 * language-agnostic: a translated edition's ISBN identifies it precisely
 * even when its title doesn't match anything in the English-centric search
 * index (e.g. an Italian edition title with no indexed translation).
 * Returns a single-item list (to match the search UI's candidate list shape)
 * or an empty list if the ISBN isn't found.
 */
export async function searchOpenLibraryByIsbn(isbn: string): Promise<OpenLibraryCandidate[]> {
  const cleaned = isbn.replace(/[-\s]/g, "");
  const res = await olFetch(`https://openlibrary.org/isbn/${encodeURIComponent(cleaned)}.json`, {
    redirect: "follow",
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Open Library ISBN lookup failed with status ${res.status}`);
  }
  const edition = (await res.json()) as OLDoc;

  const workKey = Array.isArray(edition.works) ? edition.works[0]?.key : undefined;
  const title = typeof edition.title === "string" ? edition.title : "Untitled";
  const coverId = Array.isArray(edition.covers) ? edition.covers.find((c: number) => c > 0) : undefined;

  let author: string | null = null;
  const authorRef = await resolveAuthorRef(edition, workKey);
  if (authorRef) author = await fetchAuthorName(authorRef);

  const language = extractOpenLibraryLanguage(edition);

  return [
    {
      // Use the edition key (not the work key) so a later apply re-fetches
      // this exact edition — otherwise edition-specific data like language
      // is lost when fetchOpenLibraryDetails re-fetches at the work level.
      key: String(edition.key),
      title,
      author,
      firstPublishYear: null,
      coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
      languages: language ? [language] : [],
      source: "openlibrary" as const,
    },
  ];
}

/**
 * Re-fetches full details for a candidate server-side from its Open Library
 * key, rather than trusting whatever metadata the client displayed — this is
 * the "server re-fetches before writing" guarantee from the spec. Accepts
 * either a work key (from free-text search results) or an edition key (from
 * an ISBN lookup).
 */
export async function fetchOpenLibraryDetails(key: string): Promise<OpenLibraryDetails> {
  const normalizedKey = key.startsWith("/") ? key : `/${key}`;
  const res = await olFetch(`https://openlibrary.org${normalizedKey}.json`);
  if (!res.ok) {
    throw new Error(`Open Library lookup failed with status ${res.status}`);
  }
  const data = (await res.json()) as OLDoc;

  const isEdition = normalizedKey.startsWith("/books/");
  const workKey = isEdition && Array.isArray(data.works) ? data.works[0]?.key : undefined;

  const title = typeof data.title === "string" ? data.title : "";

  let author: string | null = null;
  const authorRef = await resolveAuthorRef(data, workKey);
  if (authorRef) author = await fetchAuthorName(authorRef);

  const language = extractOpenLibraryLanguage(data);

  // ISBN and publication date live on edition records, not work records.
  // Free-text search candidates are work-keyed, so pull them from one of the
  // work's editions instead — otherwise these fields are silently left blank
  // for every match that didn't come from an ISBN lookup.
  let isbn: string | null = null;
  let publicationYear: number | null = null;
  if (isEdition) {
    isbn = extractIsbn(data);
    publicationYear = extractYear(data.publish_date);
  } else {
    const edition = await fetchRepresentativeEdition(normalizedKey);
    if (edition) {
      isbn = extractIsbn(edition);
      publicationYear = extractYear(edition.publish_date);
    }
  }

  let coverBuffer: Buffer | null = null;
  let coverExt: string | null = null;
  const coverId = Array.isArray(data.covers) ? data.covers.find((c: number) => c > 0) : undefined;
  if (coverId) {
    try {
      const coverRes = await olFetch(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);
      if (coverRes.ok) {
        coverBuffer = Buffer.from(await coverRes.arrayBuffer());
        coverExt = "jpg";
      }
    } catch {
      // Cover fetch is best-effort; the metadata apply still proceeds without it.
    }
  }

  return { key: normalizedKey, title, author, language, isbn, publicationYear, coverBuffer, coverExt };
}

/** Picks the first of a work's editions that actually has an ISBN, falling
 * back to the first edition overall if none do. Best-effort — a work with
 * no fetchable editions simply yields no ISBN/year, not an error. */
async function fetchRepresentativeEdition(workKey: string): Promise<OLDoc | null> {
  try {
    const res = await olFetch(`https://openlibrary.org${workKey}/editions.json?limit=5`);
    if (!res.ok) return null;
    const data = (await res.json()) as { entries?: OLDoc[] };
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return entries.find((e) => extractIsbn(e)) ?? entries[0] ?? null;
  } catch {
    return null;
  }
}

function extractIsbn(data: OLDoc): string | null {
  const isbn13 = Array.isArray(data.isbn_13) ? data.isbn_13[0] : undefined;
  const isbn10 = Array.isArray(data.isbn_10) ? data.isbn_10[0] : undefined;
  const value = isbn13 ?? isbn10;
  return typeof value === "string" ? value.replace(/[-\s]/g, "") : null;
}

// Open Library's publish_date is a free-text string ("1997", "March 2013",
// "2013-04-01", ...); pull out the first 4-digit year we find.
function extractYear(publishDate: unknown): number | null {
  if (typeof publishDate !== "string") return null;
  const match = publishDate.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Resolves an author reference key from either a work-style record
 * (`authors: [{ author: { key } }]`) or an edition-style record (`authors:
 * [{ key }]`, often absent — in which case fall back to the linked work).
 */
async function resolveAuthorRef(data: OLDoc, fallbackWorkKey: string | undefined): Promise<string | undefined> {
  const direct = Array.isArray(data.authors) ? data.authors[0] : undefined;
  const nested = direct?.author?.key ?? direct?.key;
  if (nested) return nested;

  if (fallbackWorkKey) {
    try {
      const workRes = await olFetch(`https://openlibrary.org${fallbackWorkKey}.json`);
      if (workRes.ok) {
        const work = (await workRes.json()) as OLDoc;
        const workAuthor = Array.isArray(work.authors) ? work.authors[0] : undefined;
        return workAuthor?.author?.key ?? workAuthor?.key;
      }
    } catch {
      // Best-effort; missing author name doesn't fail the apply.
    }
  }
  return undefined;
}

async function fetchAuthorName(authorKey: string): Promise<string | null> {
  try {
    const res = await olFetch(`https://openlibrary.org${authorKey}.json`);
    if (res.ok) {
      const data = (await res.json()) as OLDoc;
      return typeof data.name === "string" ? data.name : null;
    }
  } catch {
    // Best-effort; missing author name doesn't fail the apply.
  }
  return null;
}

// Maps Open Library's 3-letter language codes to the 2-letter codes this app
// stores elsewhere (extracted from EPUB dc:language), for the common cases;
// falls back to the raw 3-letter code when not in this list.
const OL_LANGUAGE_MAP: Record<string, string> = {
  eng: "en",
  ita: "it",
  fra: "fr",
  fre: "fr",
  deu: "de",
  ger: "de",
  spa: "es",
  por: "pt",
};

function extractOpenLibraryLanguage(data: OLDoc): string | null {
  const langKey = Array.isArray(data.languages) ? data.languages[0]?.key : undefined;
  if (typeof langKey !== "string") return null;
  const code = langKey.replace("/languages/", "").toLowerCase();
  return OL_LANGUAGE_MAP[code] ?? code;
}

const REVERSE_LANGUAGE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(OL_LANGUAGE_MAP).map(([threeLetter, twoLetter]) => [twoLetter, threeLetter])
);

// search.json's `language` field on a work-level doc is the (3-letter-coded)
// union of every indexed edition's language for that work — not a single
// language name.
function mapLanguageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const mapped = value
    .filter((v): v is string => typeof v === "string")
    .map((code) => OL_LANGUAGE_MAP[code.toLowerCase()] ?? code.toLowerCase());
  return Array.from(new Set(mapped));
}
