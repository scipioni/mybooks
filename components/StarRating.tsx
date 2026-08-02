const STAR_COUNT = 5;

export default function StarRating({
  rating,
  size = "sm",
}: {
  rating: number | null;
  size?: "sm" | "md";
}) {
  if (rating == null) return null;

  const dimension = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of ${STAR_COUNT} stars`}>
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const filled = i < rating;
        return (
          <svg
            key={i}
            viewBox="0 0 20 20"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.5}
            className={`${dimension} ${filled ? "text-amber-400" : "text-zinc-300"}`}
            aria-hidden="true"
          >
            <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
          </svg>
        );
      })}
    </div>
  );
}
