import { cn } from "@/lib/utils";
import type { MatchResult } from "@/types/game";
import styles from "./match-stats.module.css";

type StatRow = {
  label: string;
  values: [number, number];
  format?: (value: number) => string;
};

export function MatchStats({
  result,
  opponentLabel,
}: {
  result: MatchResult;
  opponentLabel: string;
}) {
  const rows: StatRow[] = [
    {
      label: "Possession",
      values: result.stats.possession,
      format: (value) => `${value}%`,
    },
    { label: "Shots", values: result.stats.shots },
    { label: "Shots on target", values: result.stats.shotsOnTarget },
    {
      label: "Expected goals",
      values: result.stats.expectedGoals,
      format: (value) => value.toFixed(2),
    },
    { label: "Yellow cards", values: result.stats.yellowCards },
    { label: "Tactical fit", values: result.stats.tacticalImpact },
  ];

  return (
    <div
      className={styles.table}
      role="table"
      aria-label="Final match statistics"
    >
      <div className={styles.head} role="row">
        <b role="columnheader">TROPHY XI</b>
        <span role="columnheader">MATCH STATISTICS</span>
        <b role="columnheader">{opponentLabel.toLocaleUpperCase()}</b>
      </div>
      {rows.map(({ label, values, format = String }) => {
        const [user, opponent] = values;
        const maximum = Math.max(user, opponent, 1);
        const leader =
          user === opponent ? "tie" : user > opponent ? "user" : "opponent";
        const userDisplay = format(user);
        const opponentDisplay = format(opponent);

        return (
          <div
            className={styles.row}
            key={label}
            role="row"
            data-leader={leader}
            aria-label={`${label}: Trophy XI ${userDisplay}, ${opponentLabel} ${opponentDisplay}`}
          >
            <b
              className={cn(leader === "user" && styles.leadingValue)}
              role="cell"
            >
              {userDisplay}
            </b>
            <div className={styles.comparison} role="cell">
              <span>{label}</span>
              <div className={styles.bars} aria-hidden>
                <i className={styles.userTrack}>
                  <span style={{ width: `${(user / maximum) * 100}%` }} />
                </i>
                <em />
                <i className={styles.opponentTrack}>
                  <span style={{ width: `${(opponent / maximum) * 100}%` }} />
                </i>
              </div>
            </div>
            <b
              className={cn(leader === "opponent" && styles.leadingValue)}
              role="cell"
            >
              {opponentDisplay}
            </b>
          </div>
        );
      })}
    </div>
  );
}
