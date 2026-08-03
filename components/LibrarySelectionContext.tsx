"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface LibrarySelectionValue {
  selected: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
  reviewing: boolean;
  startReview: () => void;
  stopReview: () => void;
}

const LibrarySelectionContext = createContext<LibrarySelectionValue | null>(null);

export function useLibrarySelection(): LibrarySelectionValue {
  const ctx = useContext(LibrarySelectionContext);
  if (!ctx) throw new Error("useLibrarySelection must be used within LibrarySelectionProvider");
  return ctx;
}

export default function LibrarySelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
  }

  return (
    <LibrarySelectionContext.Provider
      value={{
        selected,
        toggle,
        clear,
        reviewing,
        startReview: () => setReviewing(true),
        stopReview: () => {
          setReviewing(false);
          clear();
        },
      }}
    >
      {children}
    </LibrarySelectionContext.Provider>
  );
}
