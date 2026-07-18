import { cn } from "@/lib/utils";

export function TrophyMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("trophy-mark", className)}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Trophy XI"
    >
      <path d="M12 7h16v5c0 7.3-3.2 11.8-8 13.5-4.8-1.7-8-6.2-8-13.5V7Z" />
      <path d="M12 11H7c0 6 2.6 9.3 7.7 10.1M28 11h5c0 6-2.6 9.3-7.7 10.1" />
      <path d="M20 25.5V31M14 34h12M17 31h6" />
      <path d="m16.2 11.5 3.8 3.8 3.8-3.8M20 15.3V21" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark" aria-label="Trophy Eleven">
      <TrophyMark />
      {!compact && (
        <span>
          TROPHY <b>XI</b>
        </span>
      )}
    </span>
  );
}
