import { cn } from "@/lib/utils";
import type { MatchResult } from "@/types/game";
import styles from "./match-stats.module.css";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("results.stats");
  const rows: StatRow[] = [
    {
      label: t("possession"),
      values: result.stats.possession,
      format: (value) => `${value}%`,
    },
    { label: t("shots"), values: result.stats.shots },
    { label: t("shotsOnTarget"), values: result.stats.shotsOnTarget },
    {
      label: t("expectedGoals"),
      values: result.stats.expectedGoals,
      format: (value) => value.toFixed(2),
    },
    { label: t("yellowCards"), values: result.stats.yellowCards },
    { label: t("tacticalFit"), values: result.stats.tacticalImpact },
  ];

  return (
    <div
      className={styles.table}
      role="table"
      aria-label={t("aria")}
    >
      <div className={styles.head} role="row">
        <b role="columnheader">TROPHY XI</b>
        <span role="columnheader">{t("title")}</span>
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
            aria-label={t("rowAria", { label, user: userDisplay, opponent: opponentLabel, opponentValue: opponentDisplay })}
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
