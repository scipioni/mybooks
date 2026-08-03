"use client";

import { useEffect, useState } from "react";
import StarRating from "@/components/StarRating";

interface ReviewDTO {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string | null;
}

export default function ReviewSection({ bookId, isbn }: { bookId: string; isbn: string | null }) {
  const [reviews, setReviews] = useState<ReviewDTO[] | null>(null);
  const [myReview, setMyReview] = useState<ReviewDTO | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(isbn != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isbn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/reviews`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setReviews(data.reviews);
          setMyReview(data.myReview);
          if (data.myReview) {
            setRating(data.myReview.rating);
            setBody(data.myReview.body);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, isbn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save review");
        return;
      }
      setReviews(data.reviews);
      setMyReview(data.myReview);
    } catch {
      setError("Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/reviews`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to delete review");
        return;
      }
      setReviews((prev) => prev?.filter((r) => r.id !== myReview?.id) ?? null);
      setMyReview(null);
      setRating(5);
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  if (!isbn) {
    return (
      <p className="text-sm text-zinc-500">
        This book has no ISBN yet. Use &quot;Open Library metadata&quot; above to normalize it before
        reviews can be added — reviews are grouped by ISBN across users.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading reviews…</p>;
  }

  return (
    <div className="space-y-4">
      {reviews && reviews.length > 0 ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{r.authorName ?? "Unknown"}</span>
                <StarRating rating={r.rating} />
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-700">{r.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No reviews yet for this ISBN.</p>
      )}

      <form onSubmit={handleSubmit} className="rounded-md border border-zinc-200 p-3">
        <h3 className="mb-2 text-sm font-medium">{myReview ? "Edit your review" : "Write a review"}</h3>
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        <div className="mb-2 flex items-center gap-2">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} out of 5`}
              className={`h-6 w-6 ${n <= rating ? "text-amber-400" : "text-zinc-300"}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={3}
          placeholder="What did you think?"
          className="mb-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || body.trim().length === 0}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : myReview ? "Update review" : "Post review"}
          </button>
          {myReview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-sm text-red-700 hover:underline disabled:opacity-50"
            >
              Delete review
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
