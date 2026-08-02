"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

interface NavUser {
  name?: string | null;
  email?: string | null;
  role?: "admin" | "user";
}

function Icon({ path, className = "h-4 w-4" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  library: "M12 6.253v13M12 6.253C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  devices: "M9 17V7a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2h-6a2 2 0 01-2-2zM5 8v8a1 1 0 001 1h1M13 17h2",
  invites: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  book: "M12 4.5A8 8 0 003 4.5v15a7 7 0 019-1.5m0-13.5a8 8 0 019-1.5v15a7 7 0 00-9-1.5m0-13.5v13.5",
};

function NavLink({ href, label, icon }: { href: string; label: string; icon: keyof typeof ICONS }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <Icon path={ICONS[icon]} />
      {label}
    </Link>
  );
}

export default function NavBar({ user }: { user: NavUser | null }) {
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
            <Icon path={ICONS.book} className="h-4 w-4" />
          </span>
          mybooks
        </Link>
        {user ? (
          <nav className="flex items-center gap-1.5">
            <NavLink href="/library" label="Library" icon="library" />
            <NavLink href="/devices" label="Devices" icon="devices" />
            {user.role === "admin" && <NavLink href="/admin/invites" label="Invites" icon="invites" />}
            <div className="ml-2 flex items-center gap-2 border-l border-zinc-200 pl-3">
              <div
                title={user.email ?? undefined}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-white"
              >
                {initial}
              </div>
              <SignOutButton />
            </div>
          </nav>
        ) : (
          <Link
            href="/signin"
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
