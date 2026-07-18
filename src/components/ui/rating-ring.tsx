export function RatingRing({
  value,
  label,
  compact = false,
}: {
  value: number;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={compact ? "rating-ring rating-ring--compact" : "rating-ring"}
      style={{ "--rating": `${value * 3.6}deg` } as React.CSSProperties}
      aria-label={`${label}: ${value}`}
    >
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}
