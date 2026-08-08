import { NextResponse } from "next/server";
import { handleAuthError, requireUser } from "@/lib/authz";

// Candidate cover thumbnails live on Google Books / Open Library, and loading
// them directly from the browser is unreliable: extensions, DNS filters and
// corporate proxies routinely block books.google.com, which surfaces as broken
// covers in the metadata review UI even though the server can fetch them fine.
// Re-serving them from our own origin sidesteps that. The allow-list is what
// keeps this from being an open proxy (SSRF).
const ALLOWED_HOSTS = new Set(["books.google.com", "covers.openlibrary.org"]);

function placeholder(req: Request): NextResponse {
  return NextResponse.redirect(new URL("/placeholder-cover.svg", req.url));
}

export async function GET(req: Request) {
  try {
    await requireUser();

    const raw = new URL(req.url).searchParams.get("url");
    if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    // A missing cover upstream is an ordinary case, not an error — fall back to
    // the placeholder so the caller always gets a usable image.
    const res = await fetch(target, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (!res?.ok) return placeholder(req);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return placeholder(req);

    const buffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    return handleAuthError(err);
  }
}
