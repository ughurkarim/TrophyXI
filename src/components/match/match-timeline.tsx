"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import {
  Crown,
  FastForward,
  Pause,
  Play,
  SkipForward,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  const reduceMotion = useReducedMotion();
  const opponentName =
    opponent.kind === "all-stars" || opponent.tournamentYear === null
      ? opponent.nationName
      : `${opponent.nationName} ${opponent.tournamentYear}`;
  const opponentLogo =
    championLogoByCode[opponent.nationCode] ??
    championLogoByNation[normalizeNationName(opponent.nationName)];

  const [index, setIndex] = useState(reduceMotion ? result.events.length - 1 : 0);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [drawer, setDrawer] = useState<DrawerView>(null);
  const current = result.events[index];
  const complete = index >= result.events.length - 1;

  useEffect(() => {
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
    if (paused || complete || reduceMotion) return;
    const eventHold =
      current.type === "goal"
        ? 1700
        : current.type === "fulltime" || current.type === "penalties"
          ? 1450
          : 1050;
    const timeout = window.setTimeout(
      () => setIndex((value) => Math.min(result.events.length - 1, value + 1)),
      fast ? 260 : eventHold,
    );
    return () => window.clearTimeout(timeout);
  }, [complete, current.type, fast, index, paused, reduceMotion, result.events.length]);

  const finalMinute = result.events.at(-1)?.minute ?? 90;
  const matchProgress = Math.min(1, current.minute / Math.max(1, finalMinute));
  const scalePair = (
    values: [number, number],
    minimum: [number, number] = [0, 0],
  ): [number, number] =>
    values.map((value, side) =>
      Math.max(minimum[side], Math.round(value * matchProgress)),
    ) as [number, number];
  const liveShots = scalePair(result.stats.shots, [current.userScore, current.opponentScore]);
  const liveShotsOnTarget = scalePair(
    result.stats.shotsOnTarget,
    [current.userScore, current.opponentScore],
  ).map((value, side) => Math.min(value, liveShots[side])) as [number, number];
  const liveExpectedGoals = result.stats.expectedGoals.map((value) =>
    Number((value * matchProgress).toFixed(2)),
  ) as [number, number];
  const liveYellowCards = result.events.slice(0, index + 1).reduce<[number, number]>(
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
    { label: "Shots", values: liveShots, better: "higher" },
    { label: "On target", values: liveShotsOnTarget, better: "higher" },
    { label: "Chance quality", values: liveExpectedGoals, better: "higher" },
    { label: "Possession", values: result.stats.possession, better: "higher" },
    { label: "Yellow cards", values: liveYellowCards, better: "lower" },
  ];
  const eventLabel =
    current.type === "goal"
      ? current.team === "user"
        ? "GOAL · TROPHY XI"
        : "GOAL · OPPONENT"
      : current.type.replace("-", " ");
  const eventMood =
    current.type === "goal"
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
  const finalWinnerName = winnerSide === "user" ? "Trophy XI" : opponent.nationName;
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
              {complete ? "FULL TIME" : paused ? "PAUSED" : "LIVE"}
            </span>
            <div>
              <small>FINAL MATCH</small>
              <strong>THE SHOWDOWN</strong>
            </div>
          </div>
          <nav className={styles.lineupActions} aria-label="Match views">
            <button type="button" onClick={() => setDrawer("timeline")}>
              Match log
            </button>
          </nav>
        </header>

        <section
          className={`${styles.scoreboard} ${
            opponent.kind === "all-stars" ? styles.mythicScoreboard : ""
          }`}
          data-testid="live-scoreboard"
          aria-label={`Trophy XI ${current.userScore}, ${opponentName} ${current.opponentScore}, ${current.minuteLabel}`}
        >
          <span className={styles.finalKicker}>THE WORLD CUP FINAL</span>

          <div className={styles.scoreTeam}>
            <span className={styles.crest} data-side="user" aria-hidden>
              <span className={styles.xiMark}>XI</span>
            </span>
            <div>
              <small>YOUR XI</small>
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
            <div className={styles.clock}>
              <small>MATCH</small>
              <span>{current.minuteLabel}</span>
            </div>
            <motion.strong
              key={`opponent-${current.opponentScore}`}
              initial={reduceMotion ? false : { y: -5, opacity: 0.55 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {current.opponentScore}
            </motion.strong>
          </div>

          <div className={`${styles.scoreTeam} ${styles.scoreTeamRight}`}>
            <div>
              <small>
                {opponent.kind === "all-stars"
                  ? "FEATURED CHALLENGE"
                  : `WORLD CHAMPION · ${opponent.tournamentYear ?? ""}`}
              </small>
              <b>{opponent.nationName}</b>
            </div>
            <span className={styles.crest} data-side="opponent" aria-hidden>
              {opponent.kind === "all-stars" ? (
                <Crown size={22} />
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
          aria-label={`Match progress ${Math.round(matchProgress * 100)} percent`}
        >
          <span>0&apos;</span>
          <i aria-hidden>
            <b style={{ width: `${matchProgress * 100}%` }} />
          </i>
          <span>90+&apos;</span>
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
              {showFinalSummary ? (
                <>
                  <div className={styles.eventMeta}>
                    <time>FT</time>
                    <i />
                    <span>FINAL WHISTLE</span>
                  </div>
                  <h1 id="match-live-heading" className={styles.finalVerdict}>
                    {winnerSide ? (
                      <>
                        <span className={styles.finalWinnerName}>{finalWinnerName}</span>
                        {decidedOnPenalties ? " WIN ON PENALTIES" : " WIN THE FINAL"}
                      </>
                    ) : (
                      "THE FINAL ENDS LEVEL"
                    )}
                  </h1>
                  {decidedOnPenalties && penaltyScore ? (
                    <p className={styles.finalDetail}>
                      Penalties {penaltyScore[0]}–{penaltyScore[1]}
                    </p>
                  ) : decisiveGoal && decisiveGoalName ? (
                    <p className={styles.finalDetail}>
                      {decisiveGoalName} <span>·</span> {decisiveGoal.minuteLabel}
                    </p>
                  ) : (
                    <p className={styles.finalDetail}>History has its answer.</p>
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
                      GOAL
                    </motion.strong>
                  )}
                  <h1 id="match-live-heading">{current.title}</h1>
                  <p>{current.detail}</p>
                </>
              )}
            </motion.article>
          </AnimatePresence>
        </section>

        <section className={styles.stats} aria-labelledby="live-stats-heading">
          <div className={styles.sectionHeading}>
            <div className={styles.metricTitle}>
              <i />
              <h2 id="live-stats-heading">LIVE MATCH STATS</h2>
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

        <footer className={styles.controls} aria-label="Match timeline controls">
          <span className={styles.engineStatus}>
            <i />
            {fast && !complete ? "2× MATCH SPEED" : complete ? "MATCH COMPLETE" : "MATCH ENGINE LIVE"}
          </span>
          {!complete && (
            <>
              <button
                type="button"
                className={`icon-button ${styles.controlButton}`}
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Resume match" : "Pause match"}
              >
                {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
              </button>
              <button
                type="button"
                className={`icon-button ${styles.controlButton} ${
                  fast ? styles.activeControl : ""
                }`}
                onClick={() => setFast((value) => !value)}
                aria-label="Fast forward"
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
            <span>{complete ? "View final result" : "Skip to result"}</span>
            <span className={styles.skipArrow} aria-hidden>
              <SkipForward size={14} />
            </span>
          </button>
        </footer>
      </div>

      {drawer === "timeline" && (
        <TimelineDrawer
          events={result.events.slice(0, index + 1)}
          onClose={() => setDrawer(null)}
        />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {current.minuteLabel}. {current.title}. {current.detail} Score {current.userScore} to {current.opponentScore}.
      </p>
    </section>
  );
}

function TimelineDrawer({ events, onClose }: { events: MatchEvent[]; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Full match timeline"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header>
          <div>
            <span className="eyebrow eyebrow--gold">0–90+</span>
            <h2>Full match timeline</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close Full match timeline"
            autoFocus
          >
            <X size={17} aria-hidden />
          </button>
        </header>
        <ol className={styles.fullEventList} aria-label="Full match timeline">
          {[...events].reverse().map((event) => (
            <li key={event.id} data-goal={event.type === "goal"}>
              <time>{event.minuteLabel}</time>
              <div>
                <b>{event.title}</b>
                <p>{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}