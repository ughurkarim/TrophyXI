import { TrophyMark } from "@/components/brand/mark";
import type { MatchResult, PlayerTournamentCard } from "@/types/game";
import styles from "./share-card.module.css";

export function ShareCard({
  result,
  stars,
  opponentLabel,
}: {
  result: MatchResult;
  stars: PlayerTournamentCard[];
  opponentLabel: string;
}) {
  return (
    <article
      className={styles.card}
      aria-label="Trophy XI result card preview"
      data-testid="share-card-preview"
    >
      <div className={styles.top}>
        <span>
          <TrophyMark /> TROPHY XI
        </span>
        <span>FINAL RECORD</span>
      </div>
      <div className={styles.result}>
        <p>HISTORY RENDERS ITS VERDICT.</p>
        <div>
          <span>TROPHY XI</span>
          <strong>{result.score.user}</strong>
          <i aria-hidden>—</i>
          <strong>{result.score.opponent}</strong>
          <span>{opponentLabel.toLocaleUpperCase()}</span>
        </div>
        {result.score.penalties && (
          <small>
            PENALTIES {result.score.penalties[0]}–{result.score.penalties[1]}
          </small>
        )}
      </div>
      <div className={styles.stars}>
        <span>BUILT WITH</span>
        <p>
          {stars
            .map(
              (player) => `${player.playerName} ${player.tournamentYear}`,
            )
            .join(" · ")}
        </p>
      </div>
      <p className={styles.tagline}>BUILD THE XI. WRITE THE RECORD.</p>
    </article>
  );
}
