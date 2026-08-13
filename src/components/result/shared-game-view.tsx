import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { MatchStats } from "@/components/result/match-stats";
import { ButtonLink } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { assignHistoricalLineupToFormation } from "@/engine/historical-lineup";
import type { ResolvedSharedGame } from "@/lib/shared-game";
import styles from "./shared-game-view.module.css";
import { useTranslations } from "next-intl";
import { useLocalizedContent } from "@/i18n/content";

export function SharedGameView({ game }: { game: NonNullable<ResolvedSharedGame> }) {
  const t = useTranslations("sharedGame");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();
  const { payload, formation, manager, lineup, bench, picks, opponent, result } = game;
  const opponentLabel = opponent.kind === "all-stars"
    ? t("allStars")
    : `${localize(opponent.nationName)}${opponent.tournamentYear ? ` ${opponent.tournamentYear}` : ""}`;
  const opponentFormation = getFormation(opponent.formation);
  const opponentNames = (
    assignHistoricalLineupToFormation(opponent.startingLineup, opponentFormation) ??
    opponent.startingLineup
  ).map((player) => player.name.replace(/\s\d{4}$/, ""));
  const era = getDraftEra(payload.e);

  return (
    <div className={`game-page game-page--stadium ${era.themeClass}`}>
      <GameHeader step={t("step")} />
      <main className={`container ${styles.main}`}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className="eyebrow eyebrow--gold">{t("eyebrow")}</span>
            <h1>{t("title")}</h1>
            <p>{t("description")}</p>
          </div>
          <div className={styles.scoreboard} aria-label={t("scoreAria", { user: result.score.user, opponent: opponentLabel, opponentScore: result.score.opponent })}>
            <div><span>{t("challenger")}</span><b>Trophy XI</b></div>
            <strong>{result.score.user}<i>—</i>{result.score.opponent}</strong>
            <div><span>{t("champion")}</span><b>{opponentLabel}</b></div>
            {result.score.penalties && <small>{t("penalties")} {result.score.penalties[0]}–{result.score.penalties[1]}</small>}
          </div>
          <div className={styles.recordMeta}>
            <span><Users size={14} aria-hidden /> {manager.managerName}</span>
            <span><Trophy size={14} aria-hidden /> {formation.name}</span>
            <span><CalendarDays size={14} aria-hidden /> {eraT(`${era.id}.label`)}</span>
          </div>
        </section>

        <div className={styles.summaryGrid}>
          <section className={styles.panel}>
            <span className="eyebrow eyebrow--gold">{t("matchReport")}</span>
            <h2>{t("numbers")}</h2>
            <MatchStats result={result} opponentLabel={opponentLabel} />
          </section>
          <section className={styles.panel}>
            <span className="eyebrow eyebrow--gold">{t("matchTimeline")}</span>
            <h2>{t("unfolded")}</h2>
            <ol className={styles.timeline}>
              {result.events.map((event) => (
                <li key={event.id} data-goal={event.type === "goal"}>
                  <time>{event.minuteLabel}</time>
                  <div><b>{localize(event.title)}</b><p>{localize(event.detail)}</p></div>
                  <span>{event.userScore}–{event.opponentScore}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className={styles.teams}>
          <div className={styles.sectionHeading}>
            <span className="eyebrow eyebrow--gold">{t("twoSides")}</span>
            <h2>{t("exactTeams")}</h2>
          </div>
          <div className={styles.teamGrid}>
            <article className={styles.teamCard}>
              <header><div><span>{t("yourSquad")}</span><h3>Trophy XI</h3></div><strong>{result.userRatings.overall}<small>{t("overallShort")}</small></strong></header>
              <TacticalPitch formation={formation} lineup={lineup} picks={picks} />
              <p>{manager.managerName} · {formation.name}</p>
              <div className={styles.bench}><span>{t("bench")}</span>{bench.map((player) => <b key={player.id}>{player.playerName} <small>{player.tournamentYear}</small></b>)}</div>
            </article>
            <article className={styles.teamCard}>
              <header><div><span>{t("opponent")}</span><h3>{opponentLabel}</h3></div><strong>{opponent.ratings.overall}<small>{t("overallShort")}</small></strong></header>
              <TacticalPitch formation={opponentFormation} opponentNames={opponentNames} />
              <p>{opponent.managerName ?? localize(opponent.nationName)} · {opponentFormation.name}</p>
              <div className={styles.bench}><span>{t("substitutes")}</span>{opponent.substitutes.slice(0, 3).map((player) => <b key={`${player.playerIdentityId}-${player.name}`}>{player.name}</b>)}</div>
            </article>
          </div>
        </section>

        <section className={styles.cta}>
          <div><span className="eyebrow eyebrow--gold">{t("yourTurn")}</span><h2>{t("canDoBetter")}</h2></div>
          <ButtonLink href="/play">{t("buildXi")} <ArrowRight size={17} aria-hidden /></ButtonLink>
        </section>
      </main>
    </div>
  );
}
