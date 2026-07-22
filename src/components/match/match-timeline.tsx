"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Crown,
  Eye,
  FastForward,
  Pause,
  Play,
  SkipForward,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFormation } from "@/data/formations";
import { managers, managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type {
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
  MatchEvent,
  MatchResult,
  Position,
} from "@/types/game";
import styles from "./match-timeline.module.css";

type BroadcastPlayer = { id: string; name: string; position: Position };
type DrawerView = "user" | "opponent" | "timeline" | null;

const opponentCoachFor = (opponent: HistoricalWorldCupTeam) =>
  opponent.allStars?.manager ??
  managers.find(
    (manager) =>
      manager.tournamentYear === opponent.tournamentYear &&
      manager.teamName === opponent.nationName,
  );

const opponentPlayers = (lineup: HistoricalLineupPlayer[]): BroadcastPlayer[] =>
  lineup.map((player) => ({
    id: player.playerIdentityId,
    name: player.name,
    position: player.position,
  }));

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
  const formationId = useGameStore((state) => state.formationId);
  const managerId = useGameStore((state) => state.managerId);
  const picks = useGameStore((state) => state.picks);
  const formation = useMemo(
    () => (formationId ? getFormation(formationId) : null),
    [formationId],
  );
  const userManager = managerId ? managersById.get(managerId) : undefined;
  const userLineup = useMemo<BroadcastPlayer[]>(
    () =>
      formation
        ? formation.slots.flatMap((slot) => {
            const pick = picks.find((candidate) => candidate.slotId === slot.id);
            const player = pick ? playersById.get(pick.cardId) : undefined;
            return player
              ? [{
                  id: player.id,
                  name: `${player.playerName} ${player.tournamentYear}`,
                  position: slot.position,
                }]
              : [];
          })
        : [],
    [formation, picks],
  );
  const opponentManager = opponentCoachFor(opponent);
  const opponentLineup = useMemo(
    () => opponentPlayers(opponent.startingLineup),
    [opponent.startingLineup],
  );
  const opponentName =
    opponent.kind === "all-stars" || opponent.tournamentYear === null
      ? opponent.nationName
      : `${opponent.nationName} ${opponent.tournamentYear}`;
  const opponentCode =
    opponent.kind === "all-stars" ? "ALL" : opponent.nationCode;

  const [index, setIndex] = useState(reduceMotion ? result.events.length - 1 : 0);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [drawer, setDrawer] = useState<DrawerView>(null);
  const current = result.events[index];
  const complete = index >= result.events.length - 1;

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
  const liveShotsOnTarget = scalePair(result.stats.shotsOnTarget, [current.userScore, current.opponentScore])
    .map((value, side) => Math.min(value, liveShots[side])) as [number, number];
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
  const statRows: Array<{ label: string; values: [number, number] }> = [
    { label: "Shots", values: liveShots },
    { label: "On target", values: liveShotsOnTarget },
    { label: "Chance quality", values: liveExpectedGoals },
    { label: "Tactical control", values: result.stats.tacticalImpact },
    { label: "Possession", values: result.stats.possession },
    { label: "Yellow cards", values: liveYellowCards },
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
                  : { opacity: [0, 0.95, 0.38] }
              }
              transition={{ duration: reduceMotion ? 0 : 1.15, ease: "easeOut" }}
              aria-hidden
            />
          )}
        </AnimatePresence>

        <header className={styles.topbar}>
          <div className={styles.showdownTitle}>
            <span className="live-dot">
              {complete ? "FULL TIME" : paused ? "PAUSED" : "LIVE"}
            </span>
            <div>
              <small>THE FINAL STAGE</small>
              <strong>THE SHOWDOWN</strong>
            </div>
          </div>
          <nav className={styles.lineupActions} aria-label="Match views">
            <button
              onClick={() => setDrawer("user")}
              aria-label="View Trophy XI"
            >
              <Eye size={13} aria-hidden /> Trophy XI
            </button>
            <button
              onClick={() => setDrawer("opponent")}
              aria-label="View opponent XI"
            >
              <Eye size={13} aria-hidden /> Opponent
            </button>
            <button onClick={() => setDrawer("timeline")}>
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
          <div className={styles.scoreTeam}>
            <span className={styles.crest} aria-hidden>
              <Trophy size={23} />
            </span>
            <div>
              <small>YOUR TEAM</small>
              <b>Trophy XI</b>
            </div>
          </div>
          <div className={styles.score}>
            <strong>{current.userScore}</strong>
            <div className={styles.clock}>
              <small>MATCH CLOCK</small>
              <span>{current.minuteLabel}</span>
            </div>
            <strong>{current.opponentScore}</strong>
          </div>
          <div className={`${styles.scoreTeam} ${styles.scoreTeamRight}`}>
            <div>
              <small>
                {opponent.kind === "all-stars" ? "MYTHIC" : "WORLD CHAMPION"}
              </small>
              <b>{opponentName}</b>
            </div>
            <span className={styles.crest} aria-hidden>
              {opponent.kind === "all-stars" ? (
                <Crown size={23} />
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
                    ? { opacity: 0, scale: 0.9, y: 12 }
                    : { opacity: 0, y: 8 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -7 }}
              transition={{
                duration: reduceMotion ? 0 : current.type === "goal" ? 0.38 : 0.24,
                ease: "easeOut",
              }}
            >
              <div className={styles.eventMeta}>
                <time>{current.minuteLabel}</time>
                <span>{eventLabel}</span>
              </div>
              {current.type === "goal" && (
                <motion.strong
                  className={styles.goalCall}
                  initial={reduceMotion ? false : { letterSpacing: "0.34em", opacity: 0 }}
                  animate={{ letterSpacing: "0.12em", opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.42 }}
                >
                  GOAL
                </motion.strong>
              )}
              <h1 id="match-live-heading">{current.title}</h1>
              <p>{current.detail}</p>
            </motion.article>
          </AnimatePresence>
        </section>

        <section className={styles.stats} aria-labelledby="live-stats-heading">
          <div className={styles.sectionHeading}>
            <h2 id="live-stats-heading">Live match stats</h2>
            <span>
              <b>TXI</b>
              <b>{opponentCode}</b>
            </span>
          </div>
          <div className={styles.statGrid}>
            {statRows.map((stat) => {
              const total = Math.max(1, stat.values[0] + stat.values[1]);
              const leftShare = (stat.values[0] / total) * 100;
              return (
                <div className={styles.stat} key={stat.label}>
                  <div>
                    <b>{stat.values[0]}</b>
                    <span>{stat.label}</span>
                    <b>{stat.values[1]}</b>
                  </div>
                  <i aria-hidden>
                    <span style={{ width: `${leftShare}%` }} />
                  </i>
                </div>
              );
            })}
          </div>
        </section>

        <footer className={styles.controls} aria-label="Match timeline controls">
          <span className={styles.engineStatus}>
            {fast && !complete ? "2× MATCH SPEED" : `ENGINE ${result.seed}`}
          </span>
          <button
            className={`icon-button ${styles.controlButton}`}
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume match" : "Pause match"}
            disabled={complete}
          >
            {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          </button>
          <button
            className={`icon-button ${styles.controlButton} ${
              fast ? styles.activeControl : ""
            }`}
            onClick={() => setFast((value) => !value)}
            aria-label="Fast forward"
            aria-pressed={fast}
            disabled={complete}
          >
            <FastForward size={16} aria-hidden />
          </button>
          {complete ? (
            <Button onClick={onSkip}>
              View Result <SkipForward size={14} aria-hidden />
            </Button>
          ) : (
            <button className={styles.skipButton} onClick={onSkip}>
              Skip to result <SkipForward size={14} aria-hidden />
            </button>
          )}
        </footer>
      </div>

      {drawer === "user" && (
        <LineupDrawer
          teamName="Trophy XI"
          code="XI"
          coach={userManager?.managerName}
          formation={formation?.id ?? "—"}
          lineup={userLineup}
          onClose={() => setDrawer(null)}
          testId="user-lineup"
        />
      )}
      {drawer === "opponent" && (
        <LineupDrawer
          teamName={opponentName}
          code={opponent.kind === "all-stars" ? "ALL" : flagForCountry(opponent.nationCode)}
          coach={opponentManager?.managerName ?? opponent.managerName ?? undefined}
          formation={opponent.formation}
          lineup={opponentLineup}
          onClose={() => setDrawer(null)}
          testId="opponent-lineup"
        />
      )}
      {drawer === "timeline" && (
        <TimelineDrawer events={result.events.slice(0, index + 1)} onClose={() => setDrawer(null)} />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {current.minuteLabel}. {current.title}. {current.detail} Score {current.userScore} to {current.opponentScore}.
      </p>
    </section>
  );
}

function DrawerShell({
  title,
  eyebrow,
  onClose,
  children,
  testId,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} data-testid={testId}>
        <header><div><span className="eyebrow eyebrow--gold">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label={`Close ${title}`} autoFocus><X size={17} aria-hidden /></button></header>
        {children}
      </aside>
    </div>
  );
}

function LineupDrawer({
  teamName,
  code,
  coach,
  formation,
  lineup,
  onClose,
  testId,
}: {
  teamName: string;
  code: string;
  coach?: string;
  formation: string;
  lineup: BroadcastPlayer[];
  onClose: () => void;
  testId: string;
}) {
  return (
    <DrawerShell title={teamName} eyebrow="STARTING XI" onClose={onClose} testId={testId}>
      <dl className={styles.drawerMeta}><div><dt>Coach</dt><dd>{coach ?? "—"}</dd></div><div><dt>Formation</dt><dd>{formation}</dd></div></dl>
      <ol className={styles.lineupList} aria-label={`${teamName} starting lineup`}>
        {lineup.map((player) => <li key={`${player.id}-${player.position}`}><span>{player.position === "LCB" || player.position === "RCB" ? "CB" : player.position}</span><b>{player.name}</b><i>{code}</i></li>)}
      </ol>
    </DrawerShell>
  );
}

function TimelineDrawer({ events, onClose }: { events: MatchEvent[]; onClose: () => void }) {
  return (
    <DrawerShell title="Full match timeline" eyebrow="0–90+" onClose={onClose}>
      <ol className={styles.fullEventList} aria-label="Full match timeline">
        {[...events].reverse().map((event) => <li key={event.id} data-goal={event.type === "goal"}><time>{event.minuteLabel}</time><div><b>{event.title}</b><p>{event.detail}</p></div></li>)}
      </ol>
    </DrawerShell>
  );
}
