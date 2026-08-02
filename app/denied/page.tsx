import Link from "next/link";

export default function DeniedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-red-700">Access denied</h1>
      <p className="text-sm text-zinc-600">
        This Google account is not registered for mybooks. Ask an administrator to send you an
        invite for this exact email address, then try signing in again.
      </p>
      <Link
        href="/signin"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Back to sign in
      </Link>
    </div>
  );
}
