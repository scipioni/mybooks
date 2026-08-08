import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { handleAuthError, requireUser } from "@/lib/authz";
import { getBookOrThrow } from "@/lib/books";
import { getReviewsForIsbn } from "@/lib/reviews";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);

    if (!book.isbn) {
      return NextResponse.json({ isbn: null, reviews: [], myReview: null });
    }

    const allReviews = getReviewsForIsbn(book.isbn);
    const myReview = allReviews.find((r) => r.authorId === user.id) ?? null;

    return NextResponse.json({ isbn: book.isbn, reviews: allReviews, myReview });
  } catch (err) {
    return handleAuthError(err);
  }
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);

    if (!book.isbn) {
      return NextResponse.json(
        { error: "This book has no ISBN yet. Normalize its metadata before reviewing it." },
        { status: 422 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A rating (1-5) and review text are required" }, { status: 400 });
    }

    const existing = db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, user.id), eq(reviews.isbn, book.isbn)))
      .get();

    const now = new Date();
    if (existing) {
      db.update(reviews)
        .set({ rating: parsed.data.rating, body: parsed.data.body, updatedAt: now })
        .where(eq(reviews.id, existing.id))
        .run();
    } else {
      db.insert(reviews)
        .values({
          id: randomUUID(),
          userId: user.id,
          bookId: book.id,
          isbn: book.isbn,
          rating: parsed.data.rating,
          body: parsed.data.body,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const allReviews = getReviewsForIsbn(book.isbn);
    const myReview = allReviews.find((r) => r.authorId === user.id) ?? null;
    return NextResponse.json({ isbn: book.isbn, reviews: allReviews, myReview });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = getBookOrThrow(id);

    if (!book.isbn) {
      return NextResponse.json({ ok: true });
    }

    db.delete(reviews).where(and(eq(reviews.userId, user.id), eq(reviews.isbn, book.isbn))).run();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}
