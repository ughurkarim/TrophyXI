"use client";

import {
  Check,
  Copy,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { MatchStats } from "@/components/result/match-stats";
import { ShareCard } from "@/components/result/share-card";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import {
  getOpponentLabel,
  historicalOpponentsById,
} from "@/data/opponents";
import { playersById } from "@/data/players";
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import {
  getPlacementPenaltyPercent,
  getPositionFit,
} from "@/engine/draft";
import { assignHistoricalLineupToFormation } from "@/engine/historical-lineup";
import { cn } from "@/lib/utils";
import { encodeSharedGame } from "@/lib/shared-game";
import { useGameStore } from "@/store/game-store";
import type {
  PlayerMinutes,
  PlayerTournamentCard,
  TeamRatings,
} from "@/types/game";
import styles from "./result-page.module.css";

const benchSlots = ["bench-1", "bench-2", "bench-3"] as const;

const ratingRows: Array<{
  key: keyof Pick<
    TeamRatings,
    "attack" | "midfield" | "defense" | "chemistry" | "overall"
  >;
  short: string;
  label: string;
}> = [
  { key: "attack", short: "ATK", label: "Attack" },
  { key: "midfield", short: "MID", label: "Midfield" },
  { key: "defense", short: "DEF", label: "Defense" },
  { key: "chemistry", short: "CHEM", label: "Chemistry" },
  { key: "overall", short: "OVR", label: "Overall" },
];

export default function ResultPage() {
  const router = useRouter();
  const [copiedAction, setCopiedAction] = useState<
    "hero" | "share" | "link" | null
  >(null);
  const hydrated = useGameStore((state) => state.hasHydrated);
  const formationId = useGameStore((state) => state.formationId);
  const eraId = useGameStore((state) => state.eraId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const managerId = useGameStore((state) => state.managerId);
  const selectedOpponentId = useGameStore(
    (state) => state.selectedOpponentId,
  );
  const result = useGameStore((state) => state.matchResult);
  const gameMode = useGameStore((state) => state.gameMode);
  const draftSeed = useGameStore((state) => state.draftSeed);
  const restartFromManager = useGameStore(
    (state) => state.restartFromManager,
  );
  const prepareRematch = useGameStore((state) => state.prepareRematch);
  const continueWorldCupRun = useGameStore(
    (state) => state.continueWorldCupRun,
  );
  const worldCupRunOpponents = useGameStore(
    (state) => state.worldCupRunOpponents,
  );

  const formation = formationId ? getFormation(formationId) : null;
  const lineup = useMemo(
    () =>
      formation
        ? formation.slots
            .map((slot) => {
              const pick = picks.find((candidate) => candidate.slotId === slot.id);
              return pick ? playersById.get(pick.cardId) : undefined;
            })
            .filter(
              (player): player is PlayerTournamentCard => player !== undefined,
            )
        : [],
    [formation, picks],
  );
  const bench = useMemo(
    () =>
      benchSlots
        .map((slotId) => {
          const pick = benchPicks.find(
            (candidate) => candidate.slotId === slotId,
          );
          return pick ? playersById.get(pick.cardId) : undefined;
        })
        .filter(
          (player): player is PlayerTournamentCard => player !== undefined,
        ),
    [benchPicks],
  );
  const manager = managerId ? managersById.get(managerId) : undefined;
  const opponent = useMemo(() => {
    if (!selectedOpponentId) return undefined;
    const selected =
      worldCupRunOpponents.find(
        (candidate) => candidate.id === selectedOpponentId,
      ) ?? historicalOpponentsById.get(selectedOpponentId);
    return selected?.kind === "all-stars"
      ? resolveWorldCupAllStars(
          [...lineup, ...bench].map((player) => player.playerIdentityId),
        )
      : selected;
  }, [bench, lineup, selectedOpponentId, worldCupRunOpponents]);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">DEVELOPING THE RESULT</p>
      </main>
    );
  }

  if (
    !result ||
    !formation ||
    !manager ||
    !opponent ||
    lineup.length !== 11 ||
    bench.length !== 3
  ) {
    return (
      <div className="game-page">
        <GameHeader step="RESULT" />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">NO RESULT ON RECORD</span>
          <h1>The gauntlet has not been played.</h1>
          <p>Complete a fourteen-player squad and simulate the historical match.</p>
          <Button onClick={() => router.replace("/play/era")}>
            Start a game
          </Button>
        </main>
      </div>
    );
  }

  const era = getDraftEra(eraId ?? "all");
  const opponentLabel = getOpponentLabel(opponent);
  const opponentFormation = getFormation(opponent.formation);
  const opponentManager =
    opponent.allStars?.manager.managerName ?? opponent.managerName;
  const opponentNames = (
    assignHistoricalLineupToFormation(
      opponent.startingLineup,
      opponentFormation,
    ) ?? opponent.startingLineup
  ).map((player) => player.name.replace(/\s\d{4}$/, ""));
  const penaltyWin =
    result.score.penalties &&
    result.score.penalties[0] > result.score.penalties[1];
  const won = result.score.user > result.score.opponent || Boolean(penaltyWin);
  const lost =
    result.score.user < result.score.opponent ||
    Boolean(
      result.score.penalties &&
        result.score.penalties[0] < result.score.penalties[1],
    );
  const outcome = won ? "win" : lost ? "loss" : "draw";
  const stars = [...lineup, ...bench]
    .sort((first, second) => second.overall - first.overall)
    .slice(0, 3);
  const summaryText = `Trophy XI ${result.score.user}–${result.score.opponent} ${opponentLabel} — view the teams and relive the match.`;

  const sharedGameUrl = () => {
    const token = encodeSharedGame({
      v: 1,
      e: eraId ?? "all",
      f: formation.id,
      m: manager.id,
      l: lineup.map((player) => player.id),
      b: bench.map((player) => player.id),
      o: opponent.id,
      s: result.seed,
      d: draftSeed,
    });
    return `${window.location.origin}/replay/${token}`;
  };

  const copyToClipboard = async (
    value: string,
    action: "hero" | "share" | "link",
  ) => {
    await navigator.clipboard.writeText(value);
    setCopiedAction(action);
    window.setTimeout(() => {
      setCopiedAction((current) => (current === action ? null : current));
    }, 1800);
  };

  const shareGame = async (action: "hero" | "share") => {
    const url = sharedGameUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Trophy XI ${result.score.user}–${result.score.opponent} ${opponentLabel}`,
          text: summaryText,
          url,
        });
        setCopiedAction(action);
        window.setTimeout(() => setCopiedAction(null), 1800);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        await copyToClipboard(url, action);
      }
      return;
    }
    await copyToClipboard(url, action);
  };

  const contributionDetails = (player: PlayerMinutes) => {
    const details = [
      player.started
        ? "Started"
        : player.enteredAt !== null
          ? `On ${player.enteredAt}’`
          : "Did not enter",
      player.leftAt ? `Off ${player.leftAt}’` : null,
      player.goals ? `${player.goals} G` : null,
      player.assists ? `${player.assists} A` : null,
    ].filter((detail): detail is string => Boolean(detail));

    if (player.started) {
      const pick = picks.find(
        (candidate) => candidate.cardId === player.cardId,
      );
      const card = playersById.get(player.cardId);
      const slot = formation.slots.find(
        (candidate) => candidate.id === pick?.slotId,
      );
      if (card && slot) {
        const fit = getPositionFit(card, slot);
        const penalty = getPlacementPenaltyPercent(fit);
        details.push(slot.label, `${fit}% fit`);
        if (penalty > 0) details.push(`−${penalty}% placement`);
      }
    }

    return details.join(" · ");
  };

  const timelineDetail = (event: (typeof result.events)[number]) => {
    if (event.type !== "substitution") return event.detail;
    const coach =
      event.team === "user"
        ? manager.managerName
        : (opponentManager ?? opponent.nationName);
    return `${coach} turns to the bench to refresh the shape.`;
  };

  return (
    <div className="game-page game-page--result">
      <GameHeader step="FINAL RECORD" />
      <main
        className={cn("container", styles.main)}
        data-testid="result-page"
      >
        <section
          className={cn(
            styles.hero,
            outcome === "win" && styles.heroWin,
            outcome === "loss" && styles.heroLoss,
          )}
          data-outcome={outcome}
          data-testid="result-hero"
        >
          <header className={styles.heroHeader}>
            <span className={styles.kicker}>FINAL RECORD</span>
            <h1>History renders its verdict.</h1>
          </header>

          <div
            className={styles.scoreboard}
            data-testid="result-scoreboard"
            aria-label={`Final score: Trophy XI ${result.score.user}, ${opponentLabel} ${result.score.opponent}`}
          >
            <div className={cn(styles.scoreTeam, styles.scoreTeamUser)}>
              <span>YOUR SQUAD</span>
              <b>Trophy XI</b>
            </div>
            <div className={styles.score}>
              <strong>{result.score.user}</strong>
              <i aria-hidden>—</i>
              <strong>{result.score.opponent}</strong>
            </div>
            <div className={styles.scoreTeam}>
              <span>OPPONENT</span>
              <b>{opponentLabel}</b>
            </div>
            {result.score.penalties && (
              <small className={styles.penalties}>
                PENALTIES {result.score.penalties[0]}–
                {result.score.penalties[1]}
              </small>
            )}
          </div>

          <div className={styles.heroActions} data-testid="result-actions">
            {gameMode === "world-cup-run" ? (
              <Button
                className={styles.actionButton}
                onClick={() => {
                  continueWorldCupRun();
                  router.push("/play/world-cup-run");
                }}
              >
                <Trophy size={16} aria-hidden /> Continue tournament
              </Button>
            ) : (
              <>
                <Button
                  className={styles.actionButton}
                  onClick={() => {
                    prepareRematch();
                    router.push("/match");
                  }}
                >
                  <RotateCcw size={16} aria-hidden /> Play again
                </Button>
                <Button
                  className={styles.actionButton}
                  variant="secondary"
                  onClick={() => {
                    restartFromManager();
                    router.push("/play/manager");
                  }}
                >
                  <Users size={16} aria-hidden /> Redraft
                </Button>
              </>
            )}
            <Button
              className={cn(styles.actionButton, styles.tertiaryAction)}
              variant="ghost"
              onClick={() => shareGame("hero")}
            >
              {copiedAction === "hero" ? (
                <Check size={16} aria-hidden />
              ) : (
                <Share2 size={16} aria-hidden />
              )}
              {copiedAction === "hero" ? "Game link ready" : "Share game"}
            </Button>
          </div>
        </section>

        <div className={styles.reportGrid}>
          <section
            className={cn(styles.panel, styles.statsPanel)}
            data-testid="match-report"
          >
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.kicker}>MATCH REPORT</span>
                <h2>The numbers</h2>
              </div>
            </div>
            <MatchStats result={result} opponentLabel={opponentLabel} />
          </section>

          <section
            className={cn(styles.panel, styles.ratingsPanel)}
            data-testid="final-ratings"
          >
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.kicker}>TEAM PROFILE</span>
                <h2>Your final ratings</h2>
              </div>
              <Sparkles size={18} aria-hidden />
            </div>
            <div
              className={styles.ratingStack}
              aria-label="Your final team ratings"
            >
              {ratingRows.map(({ key, short, label }) => {
                const value = result.userRatings[key];
                return (
                  <div className={styles.ratingRow} key={key}>
                    <span>{short}</span>
                    <div>
                      <b>{label}</b>
                      <i aria-hidden>
                        <span style={{ width: `${value}%` }} />
                      </i>
                    </div>
                    <strong>{value}</strong>
                  </div>
                );
              })}
            </div>
            <dl className={styles.fitSummary}>
              <div>
                <dt>Position Fit</dt>
                <dd>{result.userRatings.positionFit}</dd>
              </div>
              {eraId !== "all" && (
                <div>
                  <dt>Era Fit</dt>
                  <dd>{result.userRatings.eraFit}</dd>
                </div>
              )}
              <div>
                <dt>Manager Fit</dt>
                <dd>{result.userRatings.managerFit}</dd>
              </div>
            </dl>
            <p className={styles.translationNote}>
              {eraId === "all"
                ? "Neutral era — no era modifier."
                : `Era Fit is reflected on both sides: Trophy XI ${result.userRatings.eraFit}, ${opponent.nationName} ${result.opponentEraFit}.`}
            </p>
            <aside className={styles.managerInsight}>
              <span>MANAGER INSIGHT</span>
              <p>
                <b>{manager.managerName}</b> shaped a{" "}
                {result.userRatings.managerFit}% tactical fit through{" "}
                {manager.tacticalIdentity.toLocaleLowerCase()}.
              </p>
            </aside>
          </section>
        </div>

        <section className={styles.teamSheets} data-testid="team-sheets">
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>TEAM SHEETS</span>
            <h2>Two XIs. One final record.</h2>
          </div>
          <div className={styles.teamGrid}>
            <article
              className={styles.teamCard}
              data-testid="trophy-xi-team-sheet"
            >
              <header className={styles.teamHeader}>
                <div className={styles.teamIdentity}>
                  <span aria-hidden>XI</span>
                  <div>
                    <small>YOUR SQUAD</small>
                    <h3>Trophy XI</h3>
                  </div>
                </div>
                <div className={styles.teamOverall}>
                  <span>OVR</span>
                  <b>{result.userRatings.overall}</b>
                </div>
              </header>
              <dl className={styles.teamMeta}>
                <div>
                  <dt>Manager</dt>
                  <dd>{manager.managerName}</dd>
                </div>
                <div>
                  <dt>Formation</dt>
                  <dd>{formation.name}</dd>
                </div>
                {eraId !== "all" && (
                  <div>
                    <dt>Era Fit</dt>
                    <dd>{result.userRatings.eraFit}</dd>
                  </div>
                )}
              </dl>
              <div className={styles.pitchFrame}>
                <TacticalPitch
                  formation={formation}
                  lineup={lineup}
                  picks={picks}
                />
              </div>
              <p className={styles.tacticalSummary}>
                {manager.tacticalIdentity}. Built for the {era.label} environment.
              </p>
            </article>

            <article
              className={cn(styles.teamCard, styles.opponentTeamCard)}
              data-testid="opponent-team-sheet"
            >
              <header className={styles.teamHeader}>
                <div className={styles.teamIdentity}>
                  <span aria-hidden>★</span>
                  <div>
                    <small>OPPONENT</small>
                    <h3>{opponentLabel}</h3>
                  </div>
                </div>
                <div className={styles.teamOverall}>
                  <span>OVR</span>
                  <b>{opponent.ratings.overall}</b>
                </div>
              </header>
              <dl className={styles.teamMeta}>
                <div>
                  <dt>Manager</dt>
                  <dd>{opponentManager ?? "—"}</dd>
                </div>
                <div>
                  <dt>Formation</dt>
                  <dd>{opponentFormation.name}</dd>
                </div>
                {eraId !== "all" && (
                  <div>
                    <dt>Era Fit</dt>
                    <dd>{result.opponentEraFit}</dd>
                  </div>
                )}
              </dl>
              {opponentNames.length === 11 && (
                <div className={styles.pitchFrame}>
                  <TacticalPitch
                    formation={opponentFormation}
                    opponentNames={opponentNames}
                  />
                </div>
              )}
              <p className={styles.tacticalSummary}>
                {opponent.tacticalProfile}.
              </p>
            </article>
          </div>
        </section>

        <section
          className={cn(styles.panel, styles.contributions)}
          data-testid="squad-contributions"
        >
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.kicker}>SQUAD CONTRIBUTION</span>
              <h2>All 14 contributions</h2>
            </div>
            <span className={styles.substitutionCount}>
              {result.substitutions.length} substitutions
            </span>
          </div>
          <div className={styles.contributionGrid}>
            {result.playerMinutes.map((player) => (
              <article className={styles.contributionRow} key={player.cardId}>
                <span
                  className={cn(
                    styles.roleTag,
                    !player.started && styles.roleTagBench,
                  )}
                >
                  {player.started ? "STARTER" : "BENCH"}
                </span>
                <b>
                  {player.playerName} <small>{player.tournamentYear}</small>
                </b>
                <strong>{player.minutes} min</strong>
                <p>{contributionDetails(player)}</p>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.lowerGrid}>
          <section
            className={cn(styles.panel, styles.timeline)}
            data-testid="result-timeline"
          >
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.kicker}>FULL TIMELINE</span>
                <h2>How the match turned</h2>
              </div>
            </div>
            <ol>
              {result.events.map((event) => (
                <li
                  key={event.id}
                  className={cn(
                    styles.eventRow,
                    event.type === "goal" && styles.eventGoal,
                  )}
                >
                  <time>{event.minuteLabel}</time>
                  <div>
                    <b>{event.title}</b>
                    <p>{timelineDetail(event)}</p>
                  </div>
                  <span
                    aria-label={`Score ${event.userScore} to ${event.opponentScore}`}
                  >
                    {event.userScore}–{event.opponentScore}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section
            className={cn(styles.panel, styles.sharePanel)}
            data-testid="share-result"
          >
            <div className={styles.panelHeading}>
              <div>
                <span className={styles.kicker}>SHARE</span>
                <h2>Take the result with you</h2>
              </div>
              <Share2 size={18} aria-hidden />
            </div>
            <ShareCard
              result={result}
              stars={stars}
              opponentLabel={opponentLabel}
            />
            <div className={styles.shareActions}>
              <Button
                className={styles.shareButton}
                onClick={() => shareGame("share")}
              >
                {copiedAction === "share" ? (
                  <Check size={16} aria-hidden />
                ) : (
                  <Share2 size={16} aria-hidden />
                )}
                {copiedAction === "share" ? "Game link ready" : "Share this game"}
              </Button>
              <Button
                className={styles.shareButton}
                variant="secondary"
                onClick={() => copyToClipboard(sharedGameUrl(), "link")}
              >
                {copiedAction === "link" ? (
                  <Check size={16} aria-hidden />
                ) : (
                  <Copy size={16} aria-hidden />
                )}
                {copiedAction === "link" ? "Game link copied" : "Copy game link"}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
