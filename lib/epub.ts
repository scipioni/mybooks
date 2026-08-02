import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";

export interface EpubMetadata {
  title: string | null;
  author: string | null;
  language: string | null;
  isbn: string | null;
  coverBuffer: Buffer | null;
  coverExt: string | null;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/**
 * Best-effort structural validation: a real EPUB is a zip archive containing
 * a META-INF/container.xml that points at an OPF package document, and (per
 * the OCF spec) a first-entry `mimetype` file declaring
 * `application/epub+zip` when present.
 */
export function isValidEpub(buffer: Buffer): boolean {
  try {
    const zip = new AdmZip(buffer);
    const containerEntry = zip.getEntry("META-INF/container.xml");
    if (!containerEntry) return false;

    const mimetypeEntry = zip.getEntry("mimetype");
    if (mimetypeEntry) {
      const mimetype = mimetypeEntry.getData().toString("utf-8").trim();
      if (mimetype && mimetype !== "application/epub+zip") return false;
    }

    const containerXml = parser.parse(containerEntry.getData().toString("utf-8"));
    const rootfilePath = containerXml?.container?.rootfiles?.rootfile?.["@_full-path"];
    if (!rootfilePath) return false;
    if (!zip.getEntry(rootfilePath)) return false;

    return true;
  } catch {
    return false;
  }
}

export function parseEpub(buffer: Buffer): EpubMetadata {
  const zip = new AdmZip(buffer);

  const containerEntry = zip.getEntry("META-INF/container.xml");
  if (!containerEntry) throw new Error("Invalid EPUB: missing META-INF/container.xml");
  const containerXml = parser.parse(containerEntry.getData().toString("utf-8"));
  const rootfilePath: string | undefined = containerXml?.container?.rootfiles?.rootfile?.["@_full-path"];
  if (!rootfilePath) throw new Error("Invalid EPUB: container.xml missing rootfile path");

  const opfEntry = zip.getEntry(rootfilePath);
  if (!opfEntry) throw new Error("Invalid EPUB: missing OPF package document");
  const opf = parser.parse(opfEntry.getData().toString("utf-8"));

  const pkg = opf.package ?? {};
  const metadata = pkg.metadata ?? {};

  const title = extractText(metadata["dc:title"]);
  const author = extractText(metadata["dc:creator"]);
  const language = extractLanguage(metadata["dc:language"]);
  const isbn = extractIsbn(metadata["dc:identifier"]);

  const manifestItems = normalizeArray<Record<string, string | undefined>>(pkg.manifest?.item);
  const metaItems = normalizeArray<Record<string, string | undefined>>(metadata.meta);

  let coverHref: string | null = null;

  // EPUB2-style: <meta name="cover" content="cover-image-id"/>
  const coverMeta = metaItems.find((m) => m?.["@_name"] === "cover");
  if (coverMeta) {
    const coverId = coverMeta["@_content"];
    const item = manifestItems.find((i) => i?.["@_id"] === coverId);
    if (item?.["@_href"]) coverHref = item["@_href"] ?? null;
  }

  // EPUB3-style: manifest item with properties="cover-image"
  if (!coverHref) {
    const item = manifestItems.find(
      (i) => typeof i?.["@_properties"] === "string" && i["@_properties"]!.split(/\s+/).includes("cover-image")
    );
    if (item?.["@_href"]) coverHref = item["@_href"] ?? null;
  }

  let coverBuffer: Buffer | null = null;
  let coverExt: string | null = null;
  if (coverHref) {
    const basePath = rootfilePath.includes("/") ? rootfilePath.slice(0, rootfilePath.lastIndexOf("/") + 1) : "";
    const resolvedCoverPath = normalizeZipPath(basePath + coverHref);
    const coverEntry = zip.getEntry(resolvedCoverPath);
    if (coverEntry) {
      coverBuffer = coverEntry.getData();
      const ext = resolvedCoverPath.split(".").pop();
      coverExt = ext ? ext.toLowerCase() : "jpg";
    }
  }

  return { title, author, language, isbn, coverBuffer, coverExt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(value: any): string | null {
  if (value == null) return null;
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && "#text" in v) return String(v["#text"]).trim() || null;
  return null;
}

// dc:language is a BCP 47 / ISO 639 tag (e.g. "it", "it-IT", "eng"); normalize
// to a short lowercase code without a region subtag for consistent filtering.
function extractLanguage(value: unknown): string | null {
  const text = extractText(value);
  if (!text) return null;
  return text.split(/[-_]/)[0]!.toLowerCase();
}

// dc:identifier can repeat (ISBN, internal id, DOI, ...); prefer one whose
// opf:scheme says ISBN, falling back to any value that looks like one.
function extractIsbn(value: unknown): string | null {
  const items = normalizeArray(value) as Array<string | Record<string, unknown> | undefined>;

  function textAndScheme(item: string | Record<string, unknown> | undefined): { text: string; scheme: string } {
    if (item == null) return { text: "", scheme: "" };
    if (typeof item === "string") return { text: item, scheme: "" };
    const text = "#text" in item ? String(item["#text"] ?? "") : "";
    const scheme = String(item["@_opf:scheme"] ?? item["@_scheme"] ?? "");
    return { text, scheme };
  }

  const isbnLike = (s: string) => /^(97[89])?\d{9}[\dXx]$/.test(s.replace(/[-\s]/g, ""));

  for (const item of items) {
    const { text, scheme } = textAndScheme(item);
    // Some EPUBs tag a non-ISBN internal identifier (a hash, a proprietary
    // ID) with opf:scheme="ISBN" anyway — validate the shape rather than
    // trusting the scheme label, or garbage like a SHA1 hash gets stored as
    // if it were a real ISBN.
    const cleaned = text.replace(/^urn:isbn:/i, "").trim();
    if (scheme.toUpperCase() === "ISBN" && isbnLike(cleaned)) {
      return cleaned.replace(/[-\s]/g, "");
    }
  }
  for (const item of items) {
    const { text } = textAndScheme(item);
    const cleaned = text.replace(/^urn:isbn:/i, "").trim();
    if (isbnLike(cleaned)) return cleaned.replace(/[-\s]/g, "");
  }
  return null;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeZipPath(p: string): string {
  const stack: string[] = [];
  for (const part of p.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}
