"use client";

import { X } from "lucide-react";
import { useGameStore } from "@/store/game-store";

export function SaveNotice() {
  const notice = useGameStore((state) => state.saveNotice);
  const dismiss = useGameStore((state) => state.dismissNotice);
  if (!notice) return null;
  return (
    <div className="save-notice" role="status" aria-live="polite">
      <p>{notice}</p>
      <button onClick={dismiss} aria-label="Dismiss save notice">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
