"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Device } from "@/lib/db/schema";

export default function DeviceManager({ devices }: { devices: Device[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add device");
        return;
      }
      setLabel("");
      setEmail("");
      router.refresh();
    } catch {
      setError("Failed to add device");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this device?")) return;
    await fetch(`/api/devices/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          required
          placeholder="Label (e.g. Kindle)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          placeholder="Delivery email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add device"}
        </button>
        {error && <p className="w-full text-sm text-red-700">{error}</p>}
      </form>

      {devices.length === 0 ? (
        <p className="text-sm text-zinc-500">No devices yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{device.label}</span>
                <span className="ml-2 text-zinc-500">{device.email}</span>
              </div>
              <button
                onClick={() => handleRemove(device.id)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
