import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { books, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import SignInButton from "@/components/SignInButton";
import LandingGrid from "@/components/LandingGrid";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/library");

  const admin = env.ADMIN_EMAIL
    ? db.select().from(users).where(eq(users.email, env.ADMIN_EMAIL.toLowerCase())).get()
    : null;
  const latestBooks = admin
    ? db
        .select()
        .from(books)
        .where(eq(books.ownerId, admin.id))
        .orderBy(desc(books.createdAt))
        .limit(18)
        .all()
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12 flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold">mybooks</h1>
        <p className="max-w-md text-sm text-zinc-600">
          A private, invite-only home for your ebook library — upload EPUBs, track what
          you&apos;re reading, and send books to your e-reader.
        </p>
        <SignInButton />
      </div>

      {latestBooks.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-medium text-zinc-500">Recently added</h2>
          <LandingGrid
            books={latestBooks.map((b) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              updatedAt: b.updatedAt,
            }))}
          />
        </div>
      )}
    </div>
  );
}
