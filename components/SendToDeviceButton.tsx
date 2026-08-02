"use client";

import { useState } from "react";
import type { Device } from "@/lib/db/schema";

export default function SendToDeviceButton({ bookId, devices }: { bookId: string; devices: Device[] }) {
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (devices.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No devices registered yet. Add one on the{" "}
        <a href="/devices" className="underline">
          devices page
        </a>{" "}
        to send books.
      </p>
    );
  }

  async function handleSend() {
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send book");
        return;
      }
      setMessage("Sent successfully.");
    } catch {
      setError("Failed to send book");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {devices.length > 1 ? (
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} ({d.email})
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-zinc-600">
          {devices[0].label} ({devices[0].email})
        </span>
      )}
      <button
        onClick={handleSend}
        disabled={sending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send to device"}
      </button>
      {message && <span className="text-sm text-green-700">{message}</span>}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
