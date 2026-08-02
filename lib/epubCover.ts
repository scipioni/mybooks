import AdmZip from "adm-zip";
import sharp from "sharp";
import { XMLParser } from "fast-xml-parser";
import { normalizeZipPath } from "@/lib/epub";

// The widely-cited Kindle/KDP cover recommendation (2:3 aspect ratio).
// Source images from Open Library/Google Books can be much larger or
// smaller than this — resized (cropped to fill, never upscaled past
// what's needed) rather than embedded at whatever size the source returned.
const COVER_WIDTH = 1600;
const COVER_HEIGHT = 2400;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces an EPUB's declared cover image in place, resized to a standard
 * e-reader cover resolution. Locates the cover the same way lib/epub.ts's
 * parseEpub does (EPUB2 `<meta name="cover">` or EPUB3
 * `properties="cover-image"`), so it works for whichever style the source
 * EPUB uses. If the existing cover isn't already a JPEG, the manifest entry
 * is renamed to `.jpg` and its `media-type` updated via a targeted string
 * replace on the OPF — not a full re-parse/re-serialize, to avoid
 * reformatting unrelated parts of the file.
 */
export async function embedCoverInEpub(epubBuffer: Buffer, coverBuffer: Buffer): Promise<Buffer> {
  const zip = new AdmZip(epubBuffer);

  const containerEntry = zip.getEntry("META-INF/container.xml");
  if (!containerEntry) throw new Error("Invalid EPUB: missing META-INF/container.xml");
  const containerXml = parser.parse(containerEntry.getData().toString("utf-8"));
  const rootfilePath: string | undefined = containerXml?.container?.rootfiles?.rootfile?.["@_full-path"];
  if (!rootfilePath) throw new Error("Invalid EPUB: container.xml missing rootfile path");

  const opfEntry = zip.getEntry(rootfilePath);
  if (!opfEntry) throw new Error("Invalid EPUB: missing OPF package document");
  const opfText = opfEntry.getData().toString("utf-8");
  const opf = parser.parse(opfText);

  const pkg = opf.package ?? {};
  const metadata = pkg.metadata ?? {};
  const manifestItems = normalizeArray<Record<string, string | undefined>>(pkg.manifest?.item);
  const metaItems = normalizeArray<Record<string, string | undefined>>(metadata.meta);

  let coverItem: Record<string, string | undefined> | undefined;

  // EPUB2-style: <meta name="cover" content="cover-image-id"/>
  const coverMeta = metaItems.find((m) => m?.["@_name"] === "cover");
  if (coverMeta) {
    const coverId = coverMeta["@_content"];
    coverItem = manifestItems.find((i) => i?.["@_id"] === coverId);
  }

  // EPUB3-style: manifest item with properties="cover-image"
  if (!coverItem) {
    coverItem = manifestItems.find(
      (i) => typeof i?.["@_properties"] === "string" && i["@_properties"]!.split(/\s+/).includes("cover-image")
    );
  }

  if (!coverItem?.["@_href"]) {
    throw new Error("EPUB has no declared cover image to replace");
  }

  const basePath = rootfilePath.includes("/") ? rootfilePath.slice(0, rootfilePath.lastIndexOf("/") + 1) : "";
  const oldHref = coverItem["@_href"]!;
  const oldResolvedPath = normalizeZipPath(basePath + oldHref);
  const oldMediaType = coverItem["@_media-type"] ?? "";

  const resized = await sharp(coverBuffer)
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const alreadyJpeg = /\.jpe?g$/i.test(oldHref) && (!oldMediaType || oldMediaType === "image/jpeg");

  if (alreadyJpeg) {
    zip.updateFile(oldResolvedPath, resized);
  } else {
    // Rename to .jpg alongside the original file, and point the manifest at
    // the new file/media-type — same directory, so no other references
    // (e.g. an OPF-relative content document) need updating.
    const newHref = oldHref.replace(/\.[^./]+$/, "") + ".jpg";
    const newResolvedPath = normalizeZipPath(basePath + newHref);

    zip.deleteFile(oldResolvedPath);
    zip.addFile(newResolvedPath, resized);

    let newOpfText = opfText.replace(
      new RegExp(`href="${escapeRegExp(oldHref)}"`),
      `href="${newHref}"`
    );
    if (coverItem["@_id"]) {
      const itemTagRegex = new RegExp(`<item[^>]*\\bid="${escapeRegExp(coverItem["@_id"])}"[^>]*/?>`, "i");
      const match = newOpfText.match(itemTagRegex);
      if (match) {
        const oldTag = match[0];
        const newTag = /media-type="[^"]*"/.test(oldTag)
          ? oldTag.replace(/media-type="[^"]*"/, `media-type="image/jpeg"`)
          : oldTag.replace(/\/?>$/, ` media-type="image/jpeg"$&`);
        newOpfText = newOpfText.replace(oldTag, newTag);
      }
    }

    zip.updateFile(rootfilePath, Buffer.from(newOpfText, "utf-8"));
  }

  return zip.toBuffer();
}
