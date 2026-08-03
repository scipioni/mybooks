"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MetadataReviewQueue from "@/components/MetadataReviewQueue";

type UploadStatus = "pending" | "uploading" | "done" | "error";

type QueuedFile = {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
};

type UploadedBook = {
  id: string;
  title: string;
  author: string | null;
};

function isEpub(file: File): boolean {
  return file.name.toLowerCase().endsWith(".epub") || file.type === "application/epub+zip";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewBooks, setReviewBooks] = useState<UploadedBook[] | null>(null);

  // Without this, dropping a file even slightly outside the dashed drop
  // zone below (e.g. onto the library grid, or the gap between elements)
  // makes the browser navigate the whole tab to open the file directly,
  // instead of the drop zone's own onDrop handling it.
  useEffect(() => {
    function preventDefault(e: DragEvent) {
      e.preventDefault();
    }
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const rejected = incoming.filter((f) => !isEpub(f));
    const accepted = incoming.filter(isEpub);

    setQueue((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "pending" as const,
      })),
      ...rejected.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "error" as const,
        error: "Not an EPUB file",
      })),
    ]);
  }, []);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  async function uploadOne(item: QueuedFile): Promise<UploadedBook | null> {
    setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q)));
    try {
      const formData = new FormData();
      formData.append("file", item.file);
      const res = await fetch("/api/books", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", error: data.error ?? "Upload failed" } : q
          )
        );
        return null;
      }
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "done" } : q)));
      return { id: data.book.id, title: data.book.title, author: data.book.author };
    } catch {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: "Upload failed" } : q))
      );
      return null;
    }
  }

  async function handleUploadAll() {
    const pending = queue.filter((q) => q.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    const uploaded: UploadedBook[] = [];
    // Small concurrency limit so a big batch doesn't hammer the server at once.
    const concurrency = 3;
    let index = 0;
    async function worker() {
      while (index < pending.length) {
        const item = pending[index++];
        const book = await uploadOne(item);
        if (book) uploaded.push(book);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
    setUploading(false);
    router.refresh();
    if (uploaded.length) setReviewBooks(uploaded);
  }

  const hasPending = queue.some((q) => q.status === "pending");
  const hasFinished = queue.some((q) => q.status === "done" || q.status === "error");

  if (reviewBooks) {
    return (
      <MetadataReviewQueue books={reviewBooks} onDone={() => setReviewBooks(null)} />
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-2.5 text-center transition-colors ${
          isDragging
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
        }`}
      >
        <svg
          className="h-4 w-4 flex-none text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75v12"
          />
        </svg>
        <p className="text-sm font-medium text-zinc-700">
          Drag and drop EPUB files, or click to browse{" "}
          <span className="font-normal text-zinc-400">(multiple allowed)</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,application/epub+zip"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {queue.length > 0 && (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-800">{item.file.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatSize(item.file.size)}
                  {item.status === "error" && item.error ? ` — ${item.error}` : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.status === "pending" && <span className="text-xs text-zinc-500">Pending</span>}
                {item.status === "uploading" && (
                  <span className="text-xs text-zinc-500">Uploading…</span>
                )}
                {item.status === "done" && <span className="text-xs text-green-700">Uploaded</span>}
                {item.status === "error" && <span className="text-xs text-red-700">Failed</span>}
                {item.status !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => removeFromQueue(item.id)}
                    className="text-xs text-zinc-400 hover:text-zinc-700"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {queue.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={!hasPending || uploading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : `Upload ${queue.filter((q) => q.status === "pending").length} file(s)`}
          </button>
          {hasFinished && !uploading && (
            <button
              type="button"
              onClick={() => setQueue((prev) => prev.filter((q) => q.status === "pending" || q.status === "uploading"))}
              className="text-sm text-zinc-500 hover:text-zinc-800"
            >
              Clear finished
            </button>
          )}
        </div>
      )}
    </div>
  );
}
