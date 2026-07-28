"use client";

import {
  Check,
  Home,
  RotateCcw,
  Share2,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
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
import { assignHistoricalLineupToFormation } from "@/engine/historical-lineup";
import { cn } from "@/lib/utils";
import { encodeSharedGame } from "@/lib/shared-game";
import { useGameStore } from "@/store/game-store";
import type {
  PlayerTournamentCard,
  TeamRatings,
} from "@/types/game";
import argentinaLogo from "../../../assets/circlelogo/argentina.png";
import brazilLogo from "../../../assets/circlelogo/brazil.png";
import franceLogo from "../../../assets/circlelogo/france.png";
import germanyLogo from "../../../assets/circlelogo/germany.png";
import italyLogo from "../../../assets/circlelogo/italy.png";
import spainLogo from "../../../assets/circlelogo/spain.png";
import styles from "./result-page.module.css";

const benchSlots = ["bench-1", "bench-2", "bench-3"] as const;

const championLogoByCode: Record<string, string> = {
  ARG: argentinaLogo.src,
  BRA: brazilLogo.src,
  ESP: spainLogo.src,
  FRA: franceLogo.src,
  GER: germanyLogo.src,
  DEU: germanyLogo.src,
  FRG: germanyLogo.src,
  ITA: italyLogo.src,
};

const championLogoByNation: Record<string, string> = {
  argentina: argentinaLogo.src,
  brazil: brazilLogo.src,
  france: franceLogo.src,
  germany: germanyLogo.src,
  "west germany": germanyLogo.src,
  italy: italyLogo.src,
  spain: spainLogo.src,
};

const normalizeNationName = (value: string) => value.trim().toLowerCase();

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
  const [copiedAction, setCopiedAction] = useState<"hero" | null>(null);
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
  const opponentDisplayName =
    opponent.kind === "all-stars"
      ? "All Stars"
      : `${opponent.nationName}${opponent.tournamentYear ? ` ${opponent.tournamentYear}` : ""}`;
  const opponentCountryLogo =
    opponent.kind === "all-stars"
      ? undefined
      : championLogoByCode[opponent.nationCode] ??
        championLogoByNation[normalizeNationName(opponent.nationName)];
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
  const summaryText = `Trophy XI ${result.score.user}–${result.score.opponent} ${opponentDisplayName} — view the teams and relive the match.`;

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
    action: "hero",
  ) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedAction(action);
      window.setTimeout(() => {
        setCopiedAction((current) => (current === action ? null : current));
      }, 1800);
    } catch {
      window.prompt("Copy this game link:", value);
    }
  };

  const shareGame = async (action: "hero") => {
    const url = "https://trophyxi.com";

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Trophy XI",
          text: "Build your ultimate World Cup XI.",
          url,
        });
        setCopiedAction(action);
        window.setTimeout(() => setCopiedAction(null), 1800);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copyToClipboard(url, action);
  };

  const timelineDetail = (event: (typeof result.events)[number]) => {
    if (event.type !== "substitution") return event.detail;
    const coach =
      event.team === "user"
        ? manager.managerName
        : (opponentManager ?? opponentDisplayName);
    return `${coach} turns to the bench to refresh the shape.`;
  };

  const decisiveMoment =
    [...result.events].reverse().find((event) => event.type === "goal") ??
    result.events.at(-1);

  const matchStatRows = [
    {
      key: "possession",
      label: "Possession",
      values: result.stats.possession,
      suffix: "%",
      decimals: 0,
      better: "higher",
    },
    {
      key: "shots",
      label: "Shots",
      values: result.stats.shots,
      suffix: "",
      decimals: 0,
      better: "higher",
    },
    {
      key: "shots-on-target",
      label: "On target",
      values: result.stats.shotsOnTarget,
      suffix: "",
      decimals: 0,
      better: "higher",
    },
    {
      key: "expected-goals",
      label: "Expected goals",
      values: result.stats.expectedGoals,
      suffix: "",
      decimals: 2,
      better: "higher",
    },
    {
      key: "yellow-cards",
      label: "Yellow cards",
      values: result.stats.yellowCards,
      suffix: "",
      decimals: 0,
      better: "lower",
    },
    {
      key: "tactical-fit",
      label: "Tactical fit",
      values: result.stats.tacticalImpact,
      suffix: "",
      decimals: 0,
      better: "higher",
    },
  ];

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
            <h1>{won ? "VICTORY" : lost ? "DEFEAT" : "DRAW"}</h1>
            <p className={styles.heroOutcomeMeta}>THE WORLD CUP FINAL</p>
          </header>

          <div
            className={styles.scoreboard}
            data-testid="result-scoreboard"
            aria-label={`Final score: Trophy XI ${result.score.user}, ${opponentDisplayName} ${result.score.opponent}`}
          >
            <div className={cn(styles.scoreTeam, styles.scoreTeamUser)}>
              <span className={styles.heroCrest} data-side="user" aria-hidden>
                <b>XI</b>
              </span>
              <div className={styles.scoreTeamCopy}>
                <span>YOUR SQUAD</span>
                <b>Trophy XI</b>
                <em>{manager.managerName}</em>
              </div>
            </div>

            <div className={styles.score}>
              <strong>{result.score.user}</strong>
              <i aria-hidden>—</i>
              <strong>{result.score.opponent}</strong>
            </div>

            <div className={cn(styles.scoreTeam, styles.scoreTeamOpponent)}>
              <div className={styles.scoreTeamCopy}>
                <span>OPPONENT</span>
                <b>{opponentDisplayName}</b>
                <em>{opponentManager ?? "—"}</em>
              </div>
              <span className={styles.heroCrest} data-side="opponent" aria-hidden>
                {opponent.kind === "all-stars" ? (
                  <b className={styles.allStarsMark}>✦</b>
                ) : opponentCountryLogo ? (
                  <Image
                    className={styles.heroCountryLogo}
                    src={opponentCountryLogo}
                    alt=""
                    width={64}
                    height={64}
                  />
                ) : (
                  <b>★</b>
                )}
              </span>
            </div>

            {result.score.penalties && (
              <small className={styles.penalties}>
                PENALTIES {result.score.penalties[0]}–
                {result.score.penalties[1]}
              </small>
            )}
          </div>

          {decisiveMoment && (
            <div className={styles.decisiveMoment}>
              <span>
                DECISIVE MOMENT · {decisiveMoment.minuteLabel}
              </span>
              <b>{decisiveMoment.title}</b>
              <p>{timelineDetail(decisiveMoment)}</p>
            </div>
          )}

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
                  onClick={() => router.push("/play")}
                >
                  <Home size={16} aria-hidden /> Main screen
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

            <div className={styles.statComparison}>
              <div className={styles.statTeams}>
                <b>TROPHY XI</b>
                <span>MATCH STATISTICS</span>
                <b>{opponentDisplayName}</b>
              </div>

              <div className={styles.statRows}>
                {matchStatRows.map((stat) => {
                  const maximum = Math.max(1, stat.values[0], stat.values[1]);
                  const userWidth = (stat.values[0] / maximum) * 100;
                  const opponentWidth = (stat.values[1] / maximum) * 100;
                  const even = stat.values[0] === stat.values[1];
                  const userBetter =
                    !even &&
                    (stat.better === "higher"
                      ? stat.values[0] > stat.values[1]
                      : stat.values[0] < stat.values[1]);
                  const userState = even ? "even" : userBetter ? "better" : "worse";
                  const opponentState = even
                    ? "even"
                    : userBetter
                      ? "worse"
                      : "better";
                  const formatValue = (value: number) =>
                    `${value.toFixed(stat.decimals)}${stat.suffix}`;

                  return (
                    <div className={styles.statRow} key={stat.key}>
                      <strong data-state={userState}>
                        {formatValue(stat.values[0])}
                      </strong>

                      <div className={styles.statCenter}>
                        <span>{stat.label}</span>
                        <div className={styles.statTrack} aria-hidden>
                          <i
                            className={styles.statTrackUser}
                            data-state={userState}
                          >
                            <b style={{ width: `${userWidth}%` }} />
                          </i>
                          <em />
                          <i
                            className={styles.statTrackOpponent}
                            data-state={opponentState}
                          >
                            <b style={{ width: `${opponentWidth}%` }} />
                          </i>
                        </div>
                      </div>

                      <strong data-state={opponentState}>
                        {formatValue(stat.values[1])}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className={styles.ratingStrip}
              data-testid="final-ratings"
              aria-label="Your final team ratings"
            >
              <span className={styles.ratingStripLabel}>TEAM PROFILE</span>

              <div className={cn(styles.ratingStripItem, styles.ratingStripOverall)}>
                <span>OVR</span>
                <strong>{result.userRatings.overall}</strong>
                <i aria-hidden>
                  <b style={{ width: `${result.userRatings.overall}%` }} />
                </i>
              </div>

              {ratingRows
                .filter(({ key }) => key !== "overall")
                .map(({ key, short }) => {
                  const value = result.userRatings[key];
                  return (
                    <div className={styles.ratingStripItem} key={key}>
                      <span>{short}</span>
                      <strong>{value}</strong>
                      <i aria-hidden>
                        <b style={{ width: `${value}%` }} />
                      </i>
                    </div>
                  );
                })}

              <div className={styles.ratingStripItem}>
                <span>POS</span>
                <strong>{result.userRatings.positionFit}</strong>
              </div>

              {eraId !== "all" && (
                <div className={styles.ratingStripItem}>
                  <span>ERA</span>
                  <strong>{result.userRatings.eraFit}</strong>
                </div>
              )}

              <div className={styles.ratingStripItem}>
                <span>MGR</span>
                <strong>{result.userRatings.managerFit}</strong>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.teamSheets} data-testid="team-sheets">
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>TEAM SHEETS</span>
            <h2>Two XIs. One final record.</h2>
          </div>
          <div className={styles.teamGrid}>
            <article
              className={cn(
                styles.teamCard,
                won && styles.winnerTeamCard,
              )}
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
                  <div className={styles.teamOverallMeta}>
                    {won && <small className={styles.winnerBadge}>WINNER</small>}
                    <span>OVR</span>
                  </div>
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
              className={cn(
                styles.teamCard,
                styles.opponentTeamCard,
                lost && styles.winnerTeamCard,
              )}
              data-testid="opponent-team-sheet"
            >
              <header className={styles.teamHeader}>
                <div className={styles.teamIdentity}>
                  <span className={styles.teamIdentityLogo} aria-hidden>
                    {opponent.kind === "all-stars" ? (
                      <b className={styles.allStarsMark}>✦</b>
                    ) : opponentCountryLogo ? (
                      <Image
                        src={opponentCountryLogo}
                        alt=""
                        width={44}
                        height={44}
                      />
                    ) : (
                      "★"
                    )}
                  </span>
                  <div>
                    <small>OPPONENT</small>
                    <h3>{opponentDisplayName}</h3>
                  </div>
                </div>
                <div className={styles.teamOverall}>
                  <div className={styles.teamOverallMeta}>
                    {lost && <small className={styles.winnerBadge}>WINNER</small>}
                    <span>OVR</span>
                  </div>
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


      </main>
    </div>
  );
}