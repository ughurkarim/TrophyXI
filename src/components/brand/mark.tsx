import { cn } from "@/lib/utils";

export function TrophyMark({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      className={cn("trophy-mark", className)}
      viewBox="0 0 48 48"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Trophy XI"}
      focusable="false"
    >
      <path
        className="trophy-mark__cup"
        d="M13 8.5h22v7.1c0 8.5-4.4 14.7-11 17.3-6.6-2.6-11-8.8-11-17.3V8.5Z"
      />
      <path
        className="trophy-mark__handles"
        d="M13 13H7.8v2.5c0 5.7 3 9.3 8.2 10.2M35 13h5.2v2.5c0 5.7-3 9.3-8.2 10.2"
      />
      <path className="trophy-mark__rim" d="M16.2 11.6h15.6" />

      <g className="trophy-mark__monogram" aria-hidden="true">
        <path d="m18.2 16.4 5.1 6.2M23.3 16.4l-5.1 6.2" />
        <path d="M29 16.4v6.2M27.5 16.4h3M27.5 22.6h3" />
      </g>

      <path className="trophy-mark__stem" d="M24 32.9v5.2" />
      <path className="trophy-mark__base" d="M17.3 41h13.4M20 38.1h8" />
      <path className="trophy-mark__highlight" d="M16.6 8.5h7.8" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark" role="img" aria-label="Trophy XI">
      <TrophyMark decorative />
      {!compact && (
        <span className="wordmark__text" aria-hidden="true">
          <span className="wordmark__name">TROPHY</span>
          <span className="wordmark__xi">XI</span>
        </span>
      )}
    </span>
  );
}