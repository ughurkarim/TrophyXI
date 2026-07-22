import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { MatchStats } from "@/components/result/match-stats";
import { ButtonLink } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { getOpponentLabel } from "@/data/opponents";
import { assignHistoricalLineupToFormation } from "@/engine/historical-lineup";
import type { ResolvedSharedGame } from "@/lib/shared-game";
import styles from "./shared-game-view.module.css";

export function SharedGameView({ game }: { game: NonNullable<ResolvedSharedGame> }) {
  const { payload, formation, manager, lineup, bench, picks, opponent, result } = game;
  const opponentLabel = getOpponentLabel(opponent);
  const opponentFormation = getFormation(opponent.formation);
  const opponentNames = (
    assignHistoricalLineupToFormation(opponent.startingLineup, opponentFormation) ??
    opponent.startingLineup
  ).map((player) => player.name.replace(/\s\d{4}$/, ""));
  const era = getDraftEra(payload.e);

  return (
    <div className={`game-page game-page--stadium ${era.themeClass}`}>
      <GameHeader step="SHARED MATCH" />
      <main className={`container ${styles.main}`}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className="eyebrow eyebrow--gold">A TROPHY XI MATCH RECORD</span>
            <h1>History was challenged.</h1>
            <p>This is the complete match another manager played and shared.</p>
          </div>
          <div className={styles.scoreboard} aria-label={`Final score: Trophy XI ${result.score.user}, ${opponentLabel} ${result.score.opponent}`}>
            <div><span>THE CHALLENGER</span><b>Trophy XI</b></div>
            <strong>{result.score.user}<i>—</i>{result.score.opponent}</strong>
            <div><span>THE CHAMPION</span><b>{opponentLabel}</b></div>
            {result.score.penalties && <small>PENALTIES {result.score.penalties[0]}–{result.score.penalties[1]}</small>}
          </div>
          <div className={styles.recordMeta}>
            <span><Users size={14} aria-hidden /> {manager.managerName}</span>
            <span><Trophy size={14} aria-hidden /> {formation.name}</span>
            <span><CalendarDays size={14} aria-hidden /> {era.label}</span>
          </div>
        </section>

        <div className={styles.summaryGrid}>
          <section className={styles.panel}>
            <span className="eyebrow eyebrow--gold">MATCH REPORT</span>
            <h2>The numbers</h2>
            <MatchStats result={result} opponentLabel={opponentLabel} />
          </section>
          <section className={styles.panel}>
            <span className="eyebrow eyebrow--gold">MATCH TIMELINE</span>
            <h2>How it unfolded</h2>
            <ol className={styles.timeline}>
              {result.events.map((event) => (
                <li key={event.id} data-goal={event.type === "goal"}>
                  <time>{event.minuteLabel}</time>
                  <div><b>{event.title}</b><p>{event.detail}</p></div>
                  <span>{event.userScore}–{event.opponentScore}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className={styles.teams}>
          <div className={styles.sectionHeading}>
            <span className="eyebrow eyebrow--gold">THE TWO SIDES</span>
            <h2>The exact teams that played.</h2>
          </div>
          <div className={styles.teamGrid}>
            <article className={styles.teamCard}>
              <header><div><span>YOUR SQUAD</span><h3>Trophy XI</h3></div><strong>{result.userRatings.overall}<small>OVR</small></strong></header>
              <TacticalPitch formation={formation} lineup={lineup} picks={picks} />
              <p>{manager.managerName} · {formation.name}</p>
              <div className={styles.bench}><span>BENCH</span>{bench.map((player) => <b key={player.id}>{player.playerName} <small>{player.tournamentYear}</small></b>)}</div>
            </article>
            <article className={styles.teamCard}>
              <header><div><span>OPPONENT</span><h3>{opponentLabel}</h3></div><strong>{opponent.ratings.overall}<small>OVR</small></strong></header>
              <TacticalPitch formation={opponentFormation} opponentNames={opponentNames} />
              <p>{opponent.managerName ?? opponent.nationName} · {opponentFormation.name}</p>
              <div className={styles.bench}><span>SUBSTITUTES</span>{opponent.substitutes.slice(0, 3).map((player) => <b key={`${player.playerIdentityId}-${player.name}`}>{player.name}</b>)}</div>
            </article>
          </div>
        </section>

        <section className={styles.cta}>
          <div><span className="eyebrow eyebrow--gold">YOUR TURN</span><h2>Can your fourteen do better?</h2></div>
          <ButtonLink href="/play">Build your XI <ArrowRight size={17} aria-hidden /></ButtonLink>
        </section>
      </main>
    </div>
  );
}
