import { TrophyMark } from "@/components/brand/mark";
import type { MatchResult, PlayerTournamentCard } from "@/types/game";
import styles from "./share-card.module.css";
import { useTranslations } from "next-intl";

export function ShareCard({
  result,
  stars,
  opponentLabel,
}: {
  result: MatchResult;
  stars: PlayerTournamentCard[];
  opponentLabel: string;
}) {
  const t = useTranslations("results.shareCard");
  return (
    <article
      className={styles.card}
      aria-label={t("aria")}
      data-testid="share-card-preview"
    >
      <div className={styles.top}>
        <span>
          <TrophyMark /> TROPHY XI
        </span>
        <span>{t("finalRecord")}</span>
      </div>
      <div className={styles.result}>
        <p>{t("verdict")}</p>
        <div>
          <span>TROPHY XI</span>
          <strong>{result.score.user}</strong>
          <i aria-hidden>—</i>
          <strong>{result.score.opponent}</strong>
          <span>{opponentLabel.toLocaleUpperCase()}</span>
        </div>
        {result.score.penalties && (
          <small>
            {t("penalties")} {result.score.penalties[0]}–{result.score.penalties[1]}
          </small>
        )}
      </div>
      <div className={styles.stars}>
        <span>{t("builtWith")}</span>
        <p>
          {stars
            .map(
              (player) => `${player.playerName} ${player.tournamentYear}`,
            )
            .join(" · ")}
        </p>
      </div>
      <p className={styles.tagline}>{t("tagline")}</p>
    </article>
  );
}
