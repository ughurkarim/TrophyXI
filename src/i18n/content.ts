"use client";

import { useMessages } from "next-intl";
import { useCallback, useMemo } from "react";

export function contentKey(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `copy_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** Resolve prose stored in game data without changing its canonical value. */
export function useLocalizedContent() {
  const messages = useMessages() as Record<string, unknown>;
  const content = useMemo(
    () => (messages.content ?? {}) as Record<string, string>,
    [messages],
  );

  return useCallback(
    (canonicalValue: string | undefined | null) => {
      if (!canonicalValue) return canonicalValue ?? "";
      return content[contentKey(canonicalValue)] ?? canonicalValue;
    },
    [content],
  );
}
