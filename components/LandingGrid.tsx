interface LandingBook {
  id: string;
  title: string;
  author: string | null;
  updatedAt: Date;
}

export default function LandingGrid({ books }: { books: LandingBook[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {books.map((book) => (
        <div key={book.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/public/admin-books/${book.id}/cover?v=${book.updatedAt.getTime()}`}
            alt={book.title}
            className="aspect-[2/3] w-full rounded-md border border-zinc-200 bg-white object-cover"
          />
          <p className="mt-2 truncate text-sm font-medium">{book.title}</p>
          {book.author && <p className="truncate text-xs text-zinc-500">{book.author}</p>}
        </div>
      ))}
    </div>
  );
}
