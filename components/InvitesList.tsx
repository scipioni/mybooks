"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InviteRow {
  id: string;
  email: string;
  inviterEmail: string | null;
}

export default function InvitesList({ invites }: { invites: InviteRow[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to revoke invite");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to revoke invite");
    } finally {
      setRevokingId(null);
    }
  }

  if (invites.length === 0) {
    return <p className="text-sm text-zinc-500">No pending invites.</p>;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="font-medium">{invite.email}</span>
              <span className="ml-2 text-zinc-400">invited by {invite.inviterEmail ?? "unknown"}</span>
            </div>
            <button
              onClick={() => handleRevoke(invite.id)}
              disabled={revokingId === invite.id}
              className="text-xs text-red-700 hover:underline disabled:opacity-50"
            >
              {revokingId === invite.id ? "Revoking..." : "Revoke"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
