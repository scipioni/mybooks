import { avg, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews, users } from "@/lib/db/schema";

export interface RatingAggregate {
  avgRating: number;
  reviewCount: number;
}

/**
 * Mean rating per ISBN, batched for a set of books at once (e.g. the
 * library grid) rather than one query per book.
 */
export function getAverageRatingsByIsbn(isbns: string[]): Map<string, RatingAggregate> {
  const uniqueIsbns = [...new Set(isbns)];
  if (uniqueIsbns.length === 0) return new Map();

  const rows = db
    .select({ isbn: reviews.isbn, avgRating: avg(reviews.rating), reviewCount: count(reviews.id) })
    .from(reviews)
    .where(inArray(reviews.isbn, uniqueIsbns))
    .groupBy(reviews.isbn)
    .all();

  const result = new Map<string, RatingAggregate>();
  for (const row of rows) {
    if (row.avgRating == null) continue;
    result.set(row.isbn, { avgRating: Number(row.avgRating), reviewCount: row.reviewCount });
  }
  return result;
}

export interface ReviewWithAuthor {
  id: string;
  rating: number;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string | null;
}

/** All reviews for a given ISBN, newest first, with the author's display name. */
export function getReviewsForIsbn(isbn: string): ReviewWithAuthor[] {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      body: reviews.body,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      authorId: reviews.userId,
      authorName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.isbn, isbn))
    .orderBy(desc(reviews.createdAt))
    .all();
}
