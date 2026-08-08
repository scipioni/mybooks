"use client";

const PLACEHOLDER_COVER = "/placeholder-cover.svg";

/** Fixed-size thumbnail for a search candidate's cover.
 *
 * The image is routed through /api/covers/remote (see that route for why) and
 * is treated as decorative: the candidate's title is rendered as text right
 * beside it, and an empty alt also keeps a failed load from spilling alt text
 * out of this box and pushing the row's layout around. */
export default function CandidateCover({ url }: { url: string | null }) {
  const src = url ? `/api/covers/remote?url=${encodeURIComponent(url)}` : PLACEHOLDER_COVER;

  return (
    <div className="h-16 w-11 flex-none overflow-hidden rounded-sm bg-zinc-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.endsWith(PLACEHOLDER_COVER)) img.src = PLACEHOLDER_COVER;
        }}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
