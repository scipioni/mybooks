"use client";

import { useState } from "react";

const STAR_COUNT = 5;

export default function StarRatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = hovered ?? value ?? 0;

  return (
    <div className="mt-1 flex items-center gap-1">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHovered(null)}
        role="radiogroup"
        aria-label="Rating"
      >
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= displayed;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={value === starValue}
              aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
              onMouseEnter={() => setHovered(starValue)}
              onClick={() => onChange(value === starValue ? null : starValue)}
              className="p-0.5 text-amber-400 transition-transform hover:scale-110"
            >
              <svg
                viewBox="0 0 20 20"
                fill={filled ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={filled ? 0 : 1.5}
                className={`h-6 w-6 ${filled ? "text-amber-400" : "text-zinc-300"}`}
                aria-hidden="true"
              >
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            </button>
          );
        })}
      </div>
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-xs text-zinc-400 hover:text-zinc-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
