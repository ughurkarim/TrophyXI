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
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import {
  historicalOpponentsById,
} from "@/data/opponents";
import { playersById } from "@/data/players";
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { assignHistoricalLineupToFormation } from "@/engine/historical-lineup";
import { cn } from "@/lib/utils";
import { encodeSharedGame } from "@/lib/shared-game";
import { useGameStore } from "@/store/game-store";
import { useLocalizedContent } from "@/i18n/content";
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
  shortKey: "attackShort" | "midfieldShort" | "defenseShort" | "chemistryShort" | "overallShort";
}> = [
  { key: "attack", shortKey: "attackShort" },
  { key: "midfield", shortKey: "midfieldShort" },
  { key: "defense", shortKey: "defenseShort" },
  { key: "chemistry", shortKey: "chemistryShort" },
  { key: "overall", shortKey: "overallShort" },
];

export default function ResultPage() {
  const router = useRouter();
  const t = useTranslations("results.page");
  const statsT = useTranslations("results.stats");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();
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
        <p className="eyebrow">{t("loading")}</p>
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
        <GameHeader step={t("result")} />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">{t("noResult")}</span>
          <h1>{t("noResultTitle")}</h1>
          <p>{t("noResultDescription")}</p>
          <Button onClick={() => router.replace("/play/era")}>
            {t("startGame")}
          </Button>
        </main>
      </div>
    );
  }

  const era = getDraftEra(eraId ?? "all");
  const opponentDisplayName =
    opponent.kind === "all-stars"
      ? t("allStars")
      : `${localize(opponent.nationName)}${opponent.tournamentYear ? ` ${opponent.tournamentYear}` : ""}`;
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
  const summaryText = t("shareSummary", { user: result.score.user, opponent: result.score.opponent, opponentName: opponentDisplayName });

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
      window.prompt(t("copyPrompt"), value);
    }
  };

  const shareGame = async (action: "hero") => {
    const url = "https://trophyxi.com";

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Trophy XI",
          text: t("shareText"),
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
    return t("substitutionDetail", { coach });
  };

  const decisiveMoment =
    [...result.events].reverse().find((event) => event.type === "goal") ??
    result.events.at(-1);

  const matchStatRows = [
    {
      key: "possession",
      label: statsT("possession"),
      values: result.stats.possession,
      suffix: "%",
      decimals: 0,
      better: "higher",
    },
    {
      key: "shots",
      label: statsT("shots"),
      values: result.stats.shots,
      suffix: "",
      decimals: 0,
      better: "higher",
    },
    {
      key: "shots-on-target",
      label: statsT("shotsOnTarget"),
      values: result.stats.shotsOnTarget,
      suffix: "",
      decimals: 0,
      better: "higher",
    },
    {
      key: "expected-goals",
      label: statsT("expectedGoals"),
      values: result.stats.expectedGoals,
      suffix: "",
      decimals: 2,
      better: "higher",
    },
    {
      key: "yellow-cards",
      label: statsT("yellowCards"),
      values: result.stats.yellowCards,
      suffix: "",
      decimals: 0,
      better: "lower",
    },
    {
      key: "tactical-fit",
      label: statsT("tacticalFit"),
      values: result.stats.tacticalImpact,
      suffix: "",
      decimals: 0,
      better: "higher",
    },
  ];

  return (
    <div className="game-page game-page--result">
      <GameHeader step={t("finalRecord")} />
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
            <span className={styles.kicker}>{t("finalRecord")}</span>
            <h1>{won ? t("victory") : lost ? t("defeat") : t("draw")}</h1>
            <p className={styles.heroOutcomeMeta}>{t("worldCupFinal")}</p>
          </header>

          <div
            className={styles.scoreboard}
            data-testid="result-scoreboard"
            aria-label={t("scoreAria", { user: result.score.user, opponent: opponentDisplayName, opponentScore: result.score.opponent })}
          >
            <div className={cn(styles.scoreTeam, styles.scoreTeamUser)}>
              <span className={styles.heroCrest} data-side="user" aria-hidden>
                <b>XI</b>
              </span>
              <div className={styles.scoreTeamCopy}>
                <span>{t("yourSquad")}</span>
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
                <span>{t("opponent")}</span>
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
                {t("penalties")} {result.score.penalties[0]}–
                {result.score.penalties[1]}
              </small>
            )}
          </div>

          {decisiveMoment && (
            <div className={styles.decisiveMoment}>
              <span>
                {t("decisiveMoment")} · {decisiveMoment.minuteLabel}
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
                  // Acknowledge first, but keep the result alive until the World
                  // Cup Run page mounts and finalizes the handoff.
                  continueWorldCupRun();
                  router.replace("/play/world-cup-run");
                }}
              >
                <Trophy size={16} aria-hidden />
                <span className={styles.desktopActionLabel}>{t("continueTournament")}</span>
                <span className={styles.mobileActionLabel}>{t("viewRun")}</span>
              </Button>
            ) : (
              <>
                <Button
                  className={styles.actionButton}
                  onClick={() => router.push("/match?replay=1")}
                >
                  <RotateCcw size={16} aria-hidden /> {t("playAgain")}
                </Button>
                <Button
                  className={styles.actionButton}
                  variant="secondary"
                  onClick={() => router.push("/play")}
                >
                  <Home size={16} aria-hidden /> {t("mainScreen")}
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
              {copiedAction === "hero" ? t("linkReady") : t("shareGame")}
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
                <span className={styles.kicker}>{t("matchReport")}</span>
                <h2>{t("numbers")}</h2>
              </div>
            </div>

            <div className={styles.statComparison}>
              <div className={styles.statTeams}>
                <b>TROPHY XI</b>
                <span>{statsT("title")}</span>
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
              aria-label={t("ratingsAria")}
            >
              <span className={styles.ratingStripLabel}>{t("teamProfile")}</span>

              <div className={cn(styles.ratingStripItem, styles.ratingStripOverall)}>
                <span>{t("overallShort")}</span>
                <strong>{result.userRatings.overall}</strong>
                <i aria-hidden>
                  <b style={{ width: `${result.userRatings.overall}%` }} />
                </i>
              </div>

              {ratingRows
                .filter(({ key }) => key !== "overall")
                .map(({ key, shortKey }) => {
                  const value = result.userRatings[key];
                  return (
                    <div className={styles.ratingStripItem} key={key}>
                      <span>{t(shortKey)}</span>
                      <strong>{value}</strong>
                      <i aria-hidden>
                        <b style={{ width: `${value}%` }} />
                      </i>
                    </div>
                  );
                })}

              <div className={styles.ratingStripItem}>
                <span>{t("positionShort")}</span>
                <strong>{result.userRatings.positionFit}</strong>
              </div>

              {eraId !== "all" && (
                <div className={styles.ratingStripItem}>
                  <span>{t("eraShort")}</span>
                  <strong>{result.userRatings.eraFit}</strong>
                </div>
              )}

              <div className={styles.ratingStripItem}>
                <span>{t("managerShort")}</span>
                <strong>{result.userRatings.managerFit}</strong>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.teamSheets} data-testid="team-sheets">
          <div className={styles.sectionHeading}>
            <span className={styles.kicker}>{t("teamSheets")}</span>
            <h2>{t("teamSheetsTitle")}</h2>
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
                    <small>{t("yourSquad")}</small>
                    <h3>Trophy XI</h3>
                  </div>
                </div>
                <div className={styles.teamOverall}>
                  <div className={styles.teamOverallMeta}>
                    {won && <small className={styles.winnerBadge}>{t("winner")}</small>}
                    <span>{t("overallShort")}</span>
                  </div>
                  <b>{result.userRatings.overall}</b>
                </div>
              </header>
              <dl className={styles.teamMeta}>
                <div>
                  <dt>{t("manager")}</dt>
                  <dd>{manager.managerName}</dd>
                </div>
                <div>
                  <dt>{t("formation")}</dt>
                  <dd>{formation.name}</dd>
                </div>
                {eraId !== "all" && (
                  <div>
                    <dt>{t("eraFit")}</dt>
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
                {t("tacticalSummary", { identity: localize(manager.tacticalIdentity), era: eraT(`${era.id}.label`) })}
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
                    <small>{t("opponent")}</small>
                    <h3>{opponentDisplayName}</h3>
                  </div>
                </div>
                <div className={styles.teamOverall}>
                  <div className={styles.teamOverallMeta}>
                    {lost && <small className={styles.winnerBadge}>{t("winner")}</small>}
                    <span>{t("overallShort")}</span>
                  </div>
                  <b>{opponent.ratings.overall}</b>
                </div>
              </header>
              <dl className={styles.teamMeta}>
                <div>
                  <dt>{t("manager")}</dt>
                  <dd>{opponentManager ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("formation")}</dt>
                  <dd>{opponentFormation.name}</dd>
                </div>
                {eraId !== "all" && (
                  <div>
                    <dt>{t("eraFit")}</dt>
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
                {localize(opponent.tacticalProfile)}.
              </p>
            </article>
          </div>
        </section>


      </main>
    </div>
  );
}
