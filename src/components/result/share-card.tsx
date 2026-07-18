import { TrophyMark } from "@/components/brand/mark";
import type { MatchResult, PlayerTournamentCard } from "@/types/game";

export function ShareCard({
  result,
  stars,
}: {
  result: MatchResult;
  stars: PlayerTournamentCard[];
}) {
  const won =
    result.score.user > result.score.opponent ||
    Boolean(
      result.score.penalties &&
        result.score.penalties[0] > result.score.penalties[1],
    );
  return (
    <article className="share-card" aria-label="Trophy XI share card preview">
      <div className="share-card__top">
        <span>
          <TrophyMark /> TROPHY XI
        </span>
        <span>RESULT / SEED {result.seed}</span>
      </div>
      <div className="share-card__result">
        <p>{won ? "HISTORY BEATEN" : "HISTORY HOLDS"}</p>
        <div>
          <span>TROPHY XI</span>
          <strong>{result.score.user}</strong>
          <i>—</i>
          <strong>{result.score.opponent}</strong>
          <span>SPAIN 2010</span>
        </div>
        {result.score.penalties && (
          <small>
            PENALTIES {result.score.penalties[0]}–{result.score.penalties[1]}
          </small>
        )}
      </div>
      <div className="share-card__stars">
        <span>BUILT WITH</span>
        <p>
          {stars.map((player) => `${player.playerName} ${player.tournamentYear}`).join(" · ")}
        </p>
      </div>
      <p className="share-card__tagline">BUILD THE XI. BEAT HISTORY.</p>
    </article>
  );
}
