"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  FastForward,
  Pause,
  Play,
  SkipForward,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { flagForCountry } from "@/lib/utils";
import type {
  HistoricalWorldCupTeam,
  MatchEvent,
  MatchResult,
} from "@/types/game";
import argentinaLogo from "../../../assets/circlelogo/argentina.png";
import brazilLogo from "../../../assets/circlelogo/brazil.png";
import franceLogo from "../../../assets/circlelogo/france.png";
import germanyLogo from "../../../assets/circlelogo/germany.png";
import italyLogo from "../../../assets/circlelogo/italy.png";
import spainLogo from "../../../assets/circlelogo/spain.png";
import styles from "./match-timeline.module.css";
import { useLocalizedContent } from "@/i18n/content";

type DrawerView = "timeline" | null;

const championLogoByCode: Record<string, string> = {
  ARG: argentinaLogo.src,
  BRA: brazilLogo.src,
  FRA: franceLogo.src,
  GER: germanyLogo.src,
  FRG: germanyLogo.src,
  ITA: italyLogo.src,
  ESP: spainLogo.src,
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

export function MatchTimeline({
  result,
  opponent,
  onSkip,
}: {
  result: MatchResult;
  opponent: HistoricalWorldCupTeam;
  onSkip: () => void;
}) {
  const t = useTranslations("matchTimeline");
  const localize = useLocalizedContent();
  const reduceMotion = useReducedMotion();
  const opponentDisplayName =
    opponent.kind === "all-stars" ? t("allStars") : localize(opponent.nationName);
  const opponentName =
    opponent.kind === "all-stars" || opponent.tournamentYear === null
      ? opponentDisplayName
      : `${opponentDisplayName} ${opponent.tournamentYear}`;
  const opponentLogo =
    championLogoByCode[opponent.nationCode] ??
    championLogoByNation[normalizeNationName(opponent.nationName)];

  const playbackEvents = useMemo(() => {
    const shootout = result.score.penaltyShootout ?? [];
    const alreadyHasKickEvents = result.events.some(
      (event) =>
        event.type === "penalties" && /^PEN \\d+$/.test(event.minuteLabel),
    );

    if (!shootout.length || alreadyHasKickEvents) return result.events;

    /*
     * Older/persisted results may contain the full player-by-player shootout
     * data but only one aggregate PEN event. Rebuild the missing playback
     * events here so replay can still show every taker with suspense.
     */
    const aggregatePenaltyIndex = result.events.findIndex(
      (event) => event.type === "penalties",
    );
    const extraTimeFullTimeIndex = result.events.findIndex(
      (event) => event.type === "fulltime" && event.minute > 90,
    );
    const insertionIndex =
      aggregatePenaltyIndex >= 0
        ? aggregatePenaltyIndex
        : extraTimeFullTimeIndex >= 0
          ? extraTimeFullTimeIndex
          : result.events.length;

    const kickEvents = shootout.map<MatchEvent>((kick) => ({
      id: `shootout-${kick.order}-${kick.playerId}`,
      minute: 121,
      minuteLabel: `PEN ${kick.order}`,
      type: "penalties",
      team: kick.team,
      title: t("shootout.title", { player: kick.playerName, result: kick.scored ? t("goal") : t("miss") }),
      detail: t("shootout.detail", { player: kick.playerName, result: kick.scored ? t("goal") : t("miss"), user: kick.userPenalties, opponent: kick.opponentPenalties, suddenDeath: kick.suddenDeath ? t("suddenDeath") : "" }),
      userScore: result.score.user,
      opponentScore: result.score.opponent,
    }));

    return [
      ...result.events.slice(0, insertionIndex),
      ...kickEvents,
      ...result.events.slice(insertionIndex),
    ];
  }, [result, t]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [drawer, setDrawer] = useState<DrawerView>(null);
  const current = playbackEvents[index];
  const complete = index >= playbackEvents.length - 1;
  const penaltyShootout = result.score.penaltyShootout ?? [];
  const currentPenaltyOrder =
    current.type === "penalties"
      ? Number(current.minuteLabel.match(/^PEN (\d+)$/)?.[1] ?? 0)
      : 0;
  const currentPenaltyKick =
    currentPenaltyOrder > 0
      ? penaltyShootout[currentPenaltyOrder - 1]
      : undefined;
  const previousPenaltyKick =
    currentPenaltyOrder > 1
      ? penaltyShootout[currentPenaltyOrder - 2]
      : undefined;
  const [revealedPenaltyEventId, setRevealedPenaltyEventId] = useState<string | null>(null);
  const penaltyOutcomeRevealed = revealedPenaltyEventId === current.id;

  useEffect(() => {
    // Keep the desktop broadcast framed, but never lock the mobile document:
    // Safari must be able to scroll any broadcast content taller than 100dvh.
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!currentPenaltyKick || paused) return;
    const revealTimeout = window.setTimeout(
      () => setRevealedPenaltyEventId(current.id),
      fast ? 360 : 950,
    );
    return () => window.clearTimeout(revealTimeout);
  }, [current.id, currentPenaltyKick, fast, paused]);

  useEffect(() => {
    if (paused || complete) return;
    const eventHold = currentPenaltyKick
      ? 2850
      : current.type === "goal"
        ? 1700
        : current.type === "fulltime" || current.type === "penalties"
          ? 1600
          : 1050;
    const delay = reduceMotion
      ? currentPenaltyKick
        ? 1800
        : 520
      : fast
        ? currentPenaltyKick
          ? 1200
          : 260
        : eventHold;
    const timeout = window.setTimeout(
      () =>
        setIndex((value) =>
          Math.min(playbackEvents.length - 1, value + 1),
        ),
      delay,
    );
    return () => window.clearTimeout(timeout);
  }, [
    complete,
    current.type,
    currentPenaltyKick,
    fast,
    index,
    paused,
    reduceMotion,
    playbackEvents.length,
  ]);

  const extraTimeRevealed =
    current.type === "extra-time" ||
    current.type === "penalties" ||
    current.minute > 90;
  const regularTimeProgress = Math.min(1, Math.max(0, current.minute) / 90);
  const extraTimeProgress = extraTimeRevealed
    ? Math.min(1, Math.max(0, current.minute - 90) / 30)
    : 0;

  // Stats can scale against the full played duration, but the visible match
  // bar must never reveal extra time before the ET event is actually shown.
  const statDuration = result.score.afterExtraTime ? 120 : 90;
  const statProgress = Math.min(
    1,
    Math.max(0, current.minute) / Math.max(1, statDuration),
  );
  const scalePair = (
    values: [number, number],
    minimum: [number, number] = [0, 0],
  ): [number, number] =>
    values.map((value, side) =>
      Math.max(minimum[side], Math.round(value * statProgress)),
    ) as [number, number];
  const liveShots = scalePair(result.stats.shots, [current.userScore, current.opponentScore]);
  const liveShotsOnTarget = scalePair(
    result.stats.shotsOnTarget,
    [current.userScore, current.opponentScore],
  ).map((value, side) => Math.min(value, liveShots[side])) as [number, number];
  const liveExpectedGoals = result.stats.expectedGoals.map((value) =>
    Number((value * statProgress).toFixed(2)),
  ) as [number, number];
  const liveYellowCards = playbackEvents.slice(0, index + 1).reduce<[number, number]>(
    (cards, event) => {
      if (event.type === "yellow" && event.team === "user") cards[0] += 1;
      if (event.type === "yellow" && event.team === "opponent") cards[1] += 1;
      return cards;
    },
    [0, 0],
  );
  const statRows: Array<{
    label: string;
    values: [number, number];
    better: "higher" | "lower";
  }> = [
    { label: t("stats.shots"), values: liveShots, better: "higher" },
    { label: t("stats.onTarget"), values: liveShotsOnTarget, better: "higher" },
    { label: t("stats.chanceQuality"), values: liveExpectedGoals, better: "higher" },
    { label: t("stats.possession"), values: result.stats.possession, better: "higher" },
    { label: t("stats.yellowCards"), values: liveYellowCards, better: "lower" },
  ];
  const eventLabel = currentPenaltyKick
    ? currentPenaltyKick.suddenDeath
      ? t("event.shootoutSuddenDeath")
      : t("event.shootoutKick", { order: currentPenaltyKick.order })
    : current.type === "goal"
      ? current.team === "user"
        ? t("event.goalUser")
        : t("event.goalOpponent")
      : localize(current.type.replace("-", " "));
  const eventMood = currentPenaltyKick
    ? "penalty"
    : current.type === "goal"
      ? "goal"
      : current.type === "fulltime" ||
          current.type === "penalties" ||
          current.type === "extra-time"
        ? "decisive"
        : current.type === "yellow"
          ? "caution"
          : "live";
  const penaltyScore = result.score.penalties;
  const winnerSide =
    result.score.user > result.score.opponent
      ? "user"
      : result.score.opponent > result.score.user
        ? "opponent"
        : penaltyScore
          ? penaltyScore[0] > penaltyScore[1]
            ? "user"
            : penaltyScore[1] > penaltyScore[0]
              ? "opponent"
              : null
          : null;
  const decidedOnPenalties =
    Boolean(penaltyScore) && result.score.user === result.score.opponent && winnerSide !== null;
  const finalWinnerName = winnerSide === "user" ? "Trophy XI" : opponentDisplayName;
  const decisiveGoal = winnerSide
    ? [...result.events]
        .reverse()
        .find((event) => event.type === "goal" && event.team === winnerSide)
    : undefined;
  const decisiveGoalName = decisiveGoal?.title.replace(/^GOAL\s*[—-]\s*/i, "");
  const showFinalSummary = complete && (current.type === "fulltime" || current.type === "penalties");

  return (
    <section
      className={`match-broadcast ${styles.broadcast}`}
      aria-labelledby="match-live-heading"
      data-testid="match-broadcast"
      data-event-mood={eventMood}
    >
      <div className={styles.arena}>
        <div className={styles.stadiumGlow} aria-hidden />
        <AnimatePresence>
          {current.type === "goal" && (
            <motion.div
              key={`celebration-${current.id}`}
              className={styles.celebration}
              data-team={current.team}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: [0, 0.52, 0.18] }
              }
              transition={{ duration: reduceMotion ? 0 : 1.05, ease: "easeOut" }}
              aria-hidden
            />
          )}
        </AnimatePresence>

        <header className={styles.topbar}>
          <div className={styles.showdownTitle}>
            <span className={styles.livePill} data-paused={paused} data-complete={complete}>
              <i />
              {complete ? t("fullTime") : paused ? t("paused") : t("live")}
            </span>
            <div>
              <small>{t("finalMatch")}</small>
              <strong>{t("showdown")}</strong>
            </div>
          </div>
          <nav className={styles.lineupActions} aria-label={t("viewsAria")}>
            <button type="button" onClick={() => setDrawer("timeline")}>
              {t("matchLog")}
            </button>
          </nav>
        </header>

        <section
          className={`${styles.scoreboard} ${
            opponent.kind === "all-stars" ? styles.mythicScoreboard : ""
          }`}
          data-testid="live-scoreboard"
          aria-label={t("scoreAria", { user: current.userScore, opponent: opponentName, opponentScore: current.opponentScore, minute: current.minuteLabel })}
        >
          <span className={styles.finalKicker}>{t("worldCupFinal")}</span>

          <div className={styles.scoreTeam}>
            <span className={styles.crest} data-side="user" aria-hidden>
              <span className={styles.xiMark}>XI</span>
            </span>
            <div>
              <small>{t("yourXi")}</small>
              <b>Trophy XI</b>
            </div>
          </div>

          <div className={styles.score}>
            <motion.strong
              key={`user-${current.userScore}`}
              initial={reduceMotion ? false : { y: -5, opacity: 0.55 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {current.userScore}
            </motion.strong>
            <div
              className={styles.clock}
              data-shootout={currentPenaltyKick ? "true" : undefined}
            >
              <small>{currentPenaltyKick ? t("penalties") : t("match")}</small>
              <span>
                {currentPenaltyKick
                  ? penaltyOutcomeRevealed
                    ? `${currentPenaltyKick.userPenalties}–${currentPenaltyKick.opponentPenalties}`
                    : `${previousPenaltyKick?.userPenalties ?? 0}–${previousPenaltyKick?.opponentPenalties ?? 0}`
                  : current.minuteLabel}
              </span>
            </div>
            <motion.strong
              key={`opponent-${current.opponentScore}`}
              initial={reduceMotion ? false : { y: -5, opacity: 0.55 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {current.opponentScore}
            </motion.strong>
          </div>

          <div
            className={`${styles.scoreTeam} ${styles.scoreTeamRight}`}
            data-long-name={opponentDisplayName.length >= 11 ? "true" : undefined}
          >
            <div>
              <small>
                {opponent.kind === "all-stars"
                  ? t("featuredChallenge")
                  : t("worldChampionYear", { year: opponent.tournamentYear ?? "" })}
              </small>
              <b>{opponentDisplayName}</b>
            </div>
            <span className={styles.crest} data-side="opponent" aria-hidden>
              {opponent.kind === "all-stars" ? (
                <span
                  role="img"
                  aria-label={t("allStarsLogo")}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "100%",
                    height: "100%",
                    lineHeight: 1,
                    fontSize: "2rem",
                    color: "#e4bb4f",
                    transform: "translateY(-1px)",
                    textShadow: "0 0 12px rgba(228, 187, 79, 0.24)",
                  }}
                >
                  ✦
                </span>
              ) : opponentLogo ? (
                <Image
                  className={styles.opponentLogo}
                  src={opponentLogo}
                  alt=""
                  width={48}
                  height={48}
                />
              ) : (
                flagForCountry(opponent.nationCode)
              )}
            </span>
          </div>
        </section>

        <div
          className={styles.matchProgress}
          data-extra-time={extraTimeRevealed ? "true" : undefined}
          aria-label={
            extraTimeRevealed
              ? t("extraTimeProgressAria", { percent: Math.round(extraTimeProgress * 100) })
              : t("progressAria", { percent: Math.round(regularTimeProgress * 100) })
          }
        >
          <span>0&apos;</span>
          <div
            className={styles.progressTracks}
            data-extra-time={extraTimeRevealed ? "true" : undefined}
            aria-hidden
          >
            <i className={styles.regularTimeTrack}>
              <b style={{ width: `${regularTimeProgress * 100}%` }} />
            </i>
            {extraTimeRevealed && (
              <>
                <span className={styles.extraTimeMarker}>90&apos;</span>
                <i className={styles.extraTimeTrack}>
                  <b style={{ width: `${extraTimeProgress * 100}%` }} />
                </i>
              </>
            )}
          </div>
          <span>{extraTimeRevealed ? "120'" : "90'"}</span>
        </div>

        <section className={styles.moment} data-mood={eventMood}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={current.id}
              initial={
                reduceMotion
                  ? false
                  : current.type === "goal"
                    ? { opacity: 0, scale: 0.96, y: 8 }
                    : { opacity: 0, y: 6 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{
                duration: reduceMotion ? 0 : current.type === "goal" ? 0.34 : 0.22,
                ease: "easeOut",
              }}
            >
              {currentPenaltyKick ? (
                <div
                  className={styles.penaltyMoment}
                  data-result={
                    penaltyOutcomeRevealed
                      ? currentPenaltyKick.scored
                        ? "goal"
                        : "miss"
                      : "waiting"
                  }
                >
                  <div className={styles.eventMeta}>
                    <time>{currentPenaltyKick.suddenDeath ? "SD" : `P${currentPenaltyKick.order}`}</time>
                    <i />
                    <span>{eventLabel}</span>
                  </div>
                  <span className={styles.penaltySide}>
                    {currentPenaltyKick.team === "user"
                      ? "TROPHY XI"
                      : opponentDisplayName.toUpperCase()}
                  </span>
                  <h1
                    id="match-live-heading"
                    className={styles.penaltyTakerName}
                  >
                    {currentPenaltyKick.playerName}
                  </h1>
                  <p className={styles.penaltyApproach}>
                    {t("shootout.approach")}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    {penaltyOutcomeRevealed ? (
                      <motion.strong
                        key={`penalty-result-${currentPenaltyKick.order}`}
                        className={styles.penaltyOutcome}
                        data-result={currentPenaltyKick.scored ? "goal" : "miss"}
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: reduceMotion ? 0 : 0.24 }}
                      >
                        {currentPenaltyKick.scored ? t("goal") : t("miss")}
                      </motion.strong>
                    ) : (
                      <motion.span
                        key={`penalty-wait-${currentPenaltyKick.order}`}
                        className={styles.penaltyWaiting}
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {t("shootout.whistle")}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {penaltyOutcomeRevealed && (
                    <p className={styles.penaltyRunningScore}>
                      {t("shootout.label")}{" "}
                      <b>
                        {currentPenaltyKick.userPenalties}–
                        {currentPenaltyKick.opponentPenalties}
                      </b>
                      {currentPenaltyKick.suddenDeath ? ` · ${t("suddenDeath")}` : ""}
                    </p>
                  )}
                </div>
              ) : showFinalSummary ? (
                <>
                  <div className={styles.eventMeta}>
                    <time>FT</time>
                    <i />
                    <span>{t("finalWhistle")}</span>
                  </div>
                  <h1 id="match-live-heading" className={styles.finalVerdict}>
                    {winnerSide ? (
                      <>
                        <span className={styles.finalWinnerName}>{finalWinnerName}</span>
                        <span className={styles.desktopFinalOutcome}>
                          {decidedOnPenalties ? ` ${t("winOnPenalties")}` : ` ${t("winFinal")}`}
                        </span>
                        <span className={styles.mobileFinalOutcome}>
                          {winnerSide === "user"
                            ? ` ${t("winWorldCup")}`
                            : ` ${t("areWorldChampions")}`}
                        </span>
                      </>
                    ) : (
                      t("finalLevel")
                    )}
                  </h1>
                  {decidedOnPenalties && penaltyScore ? (
                    <p className={styles.finalDetail}>
                      {t("penalties")} {penaltyScore[0]}–{penaltyScore[1]}
                    </p>
                  ) : decisiveGoal && decisiveGoalName ? (
                    <p className={styles.finalDetail}>
                      {decisiveGoalName} <span>·</span> {decisiveGoal.minuteLabel}
                    </p>
                  ) : (
                    <p className={styles.finalDetail}>{t("historyAnswer")}</p>
                  )}
                </>
              ) : (
                <>
                  <div className={styles.eventMeta}>
                    <time>{current.minuteLabel}</time>
                    <i />
                    <span>{eventLabel}</span>
                  </div>
                  {current.type === "goal" && (
                    <motion.strong
                      className={styles.goalCall}
                      initial={reduceMotion ? false : { letterSpacing: "0.24em", opacity: 0 }}
                      animate={{ letterSpacing: "0.1em", opacity: 1 }}
                      transition={{ duration: reduceMotion ? 0 : 0.36 }}
                    >
                      {t("goal")}
                    </motion.strong>
                  )}
                  <h1 id="match-live-heading">{localize(current.title)}</h1>
                  <p>{localize(current.detail)}</p>
                </>
              )}
            </motion.article>
          </AnimatePresence>
        </section>

        <section className={styles.stats} aria-labelledby="live-stats-heading">
          <div className={styles.sectionHeading}>
            <div className={styles.metricTitle}>
              <i />
              <h2 id="live-stats-heading">{t("liveStats")}</h2>
              <i />
            </div>
          </div>
          <div className={styles.statGrid}>
            {statRows.map((stat) => {
              const max = Math.max(1, stat.values[0], stat.values[1]);
              const leftWidth = (stat.values[0] / max) * 100;
              const rightWidth = (stat.values[1] / max) * 100;
              const even = stat.values[0] === stat.values[1];
              const userBetter =
                !even &&
                (stat.better === "higher"
                  ? stat.values[0] > stat.values[1]
                  : stat.values[0] < stat.values[1]);
              const userState = even ? "even" : userBetter ? "better" : "worse";
              const opponentState = even ? "even" : userBetter ? "worse" : "better";

              return (
                <div className={styles.stat} key={stat.label}>
                  <div>
                    <b data-state={userState}>{stat.values[0]}</b>
                    <span>{stat.label}</span>
                    <b data-state={opponentState}>{stat.values[1]}</b>
                  </div>
                  <div className={styles.statBars} aria-hidden>
                    <i data-side="user" data-state={userState}>
                      <em style={{ width: `${leftWidth}%` }} />
                    </i>
                    <i data-side="opponent" data-state={opponentState}>
                      <em style={{ width: `${rightWidth}%` }} />
                    </i>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className={styles.controls} aria-label={t("controlsAria")}>
          <span className={styles.engineStatus}>
            <i />
            {fast && !complete ? t("speed2x") : complete ? t("matchComplete") : t("engineLive")}
          </span>
          {!complete && (
            <>
              <button
                type="button"
                className={`icon-button ${styles.controlButton}`}
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? t("resume") : t("pause")}
              >
                {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
              </button>
              <button
                type="button"
                className={`icon-button ${styles.controlButton} ${
                  fast ? styles.activeControl : ""
                }`}
                onClick={() => setFast((value) => !value)}
                aria-label={t("fastForward")}
                aria-pressed={fast}
              >
                <FastForward size={16} aria-hidden />
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.skipButton}
            data-complete={complete}
            onClick={onSkip}
          >
            <span>{complete ? t("viewFinalResult") : t("skipResult")}</span>
            <span className={styles.skipArrow} aria-hidden>
              <SkipForward size={14} />
            </span>
          </button>
        </footer>
      </div>

      {drawer === "timeline" && (
        <TimelineDrawer
          events={playbackEvents.slice(0, index + 1)}
          onClose={() => setDrawer(null)}
        />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {t("liveAnnouncement", { minute: current.minuteLabel, title: localize(current.title), detail: localize(current.detail), user: current.userScore, opponent: current.opponentScore })}
      </p>
    </section>
  );
}

function TimelineDrawer({ events, onClose }: { events: MatchEvent[]; onClose: () => void }) {
  const t = useTranslations("matchTimeline");
  const localize = useLocalizedContent();
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={t("fullTimeline")}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header>
          <div>
            <span className="eyebrow eyebrow--gold">0–90+</span>
            <h2>{t("fullTimeline")}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("closeTimeline")}
            autoFocus
          >
            <X size={17} aria-hidden />
          </button>
        </header>
        <ol className={styles.fullEventList} aria-label={t("fullTimeline")}>
          {[...events].reverse().map((event) => (
            <li key={event.id} data-goal={event.type === "goal"}>
              <time>{event.minuteLabel}</time>
              <div>
                <b>{localize(event.title)}</b>
                <p>{localize(event.detail)}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
