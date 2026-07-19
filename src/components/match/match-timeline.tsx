"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FastForward, Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFormation } from "@/data/formations";
import { managers, managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";
import { flagForCountry } from "@/lib/utils";
import type {
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
  MatchResult,
  Position,
} from "@/types/game";
import styles from "./match-timeline.module.css";

type BroadcastLine = "goalkeeper" | "defense" | "midfield" | "attack";

type BroadcastPlayer = {
  id: string;
  name: string;
  position: Position;
};

const lineOrder: BroadcastLine[] = [
  "goalkeeper",
  "defense",
  "midfield",
  "attack",
];

const lineLabels: Record<BroadcastLine, string> = {
  goalkeeper: "GK",
  defense: "DEF",
  midfield: "MID",
  attack: "FWD",
};

const lineForPosition = (position: Position): BroadcastLine => {
  if (position === "GK") return "goalkeeper";
  if (
    ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)
  ) {
    return "defense";
  }
  if (["DM", "CM", "AM", "LM", "RM"].includes(position)) {
    return "midfield";
  }
  return "attack";
};

const opponentCoachFor = (opponent: HistoricalWorldCupTeam) =>
  opponent.allStars?.manager ??
  managers.find(
    (manager) =>
      manager.tournamentYear === opponent.tournamentYear &&
      manager.teamName === opponent.nationName,
  );

const opponentPlayers = (
  lineup: HistoricalLineupPlayer[],
): BroadcastPlayer[] =>
  lineup.map((player) => ({
    id: player.playerIdentityId,
    name: player.name,
    position: player.position,
  }));

function TeamPanel({
  side,
  teamName,
  code,
  coach,
  formation,
  lineup,
  label,
  mythic = false,
}: {
  side: "user" | "opponent";
  teamName: string;
  code: string;
  coach?: string;
  formation: string;
  lineup: BroadcastPlayer[];
  label: string;
  mythic?: boolean;
}) {
  const grouped = lineOrder.map((line) => ({
    line,
    players: lineup.filter(
      (player) => lineForPosition(player.position) === line,
    ),
  }));

  return (
    <aside
      className={`${styles.teamPanel} ${
        side === "opponent" ? styles.opponentPanel : ""
      } ${mythic ? styles.mythicPanel : ""}`}
      data-testid={`${side}-lineup`}
      aria-label={`${teamName} starting lineup`}
    >
      <div className={styles.teamIdentity}>
        <span
          className={`${styles.crest} ${mythic ? styles.mythicCrest : ""}`}
          aria-hidden
        >
          {side === "user" || mythic ? "XI" : flagForCountry(code)}
        </span>
        <div>
          <small>{label}</small>
          <h2>{teamName}</h2>
        </div>
      </div>

      <dl className={styles.teamMeta}>
        {coach && (
          <div>
            <dt>Coach</dt>
            <dd>{coach}</dd>
          </div>
        )}
        <div>
          <dt>Formation</dt>
          <dd>{formation}</dd>
        </div>
      </dl>

      {lineup.length === 11 && (
        <>
          <div className={styles.lineupHeading}>
            <span>STARTING XI</span>
            <b>11/11</b>
          </div>
          <div className={styles.lineupLines}>
            {grouped.map(({ line, players }) => (
              <div className={styles.lineupLine} key={line}>
                <span>{lineLabels[line]}</span>
                <ol aria-label={`${teamName} ${line}`}>
                  {players.map((player) => (
                    <li key={`${player.id}-${player.position}`}>
                      <b>{player.position}</b>
                      <span>{player.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

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
              ? [
                  {
                    id: player.id,
                    name: `${player.playerName} ${player.tournamentYear}`,
                    position: slot.position,
                  },
                ]
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
  const opponentLabel =
    opponent.kind === "all-stars"
      ? "MYTHIC"
      : opponent.tournamentFinish === "champion"
        ? "CHAMPION"
        : "OPPONENT";

  const [index, setIndex] = useState(
    reduceMotion ? result.events.length - 1 : 0,
  );
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const current = result.events[index];
  const complete = index >= result.events.length - 1;
  const visibleEvents = useMemo(
    () => result.events.slice(Math.max(0, index - 3), index + 1).reverse(),
    [index, result.events],
  );

  useEffect(() => {
    if (paused || complete || reduceMotion) return;
    const timeout = window.setTimeout(
      () => setIndex((value) => Math.min(result.events.length - 1, value + 1)),
      fast ? 260 : 850,
    );
    return () => window.clearTimeout(timeout);
  }, [complete, fast, paused, reduceMotion, result.events.length, index]);

  const finalMinute = result.events.at(-1)?.minute ?? 90;
  const matchProgress = Math.min(1, current.minute / Math.max(1, finalMinute));
  const scalePair = (
    values: [number, number],
    minimum: [number, number] = [0, 0],
  ): [number, number] =>
    values.map((value, side) =>
      Math.max(minimum[side], Math.round(value * matchProgress)),
    ) as [number, number];
  const liveShots = scalePair(result.stats.shots, [
    current.userScore,
    current.opponentScore,
  ]);
  const liveShotsOnTarget = scalePair(result.stats.shotsOnTarget, [
    current.userScore,
    current.opponentScore,
  ]).map((value, side) => Math.min(value, liveShots[side])) as [number, number];
  const liveExpectedGoals = result.stats.expectedGoals.map((value) =>
    (value * matchProgress).toFixed(2),
  ) as [string, string];
  const liveYellowCards = result.events
    .slice(0, index + 1)
    .reduce<[number, number]>(
      (cards, event) => {
        if (event.type === "yellow" && event.team === "user") cards[0] += 1;
        if (event.type === "yellow" && event.team === "opponent") cards[1] += 1;
        return cards;
      },
      [0, 0],
    );
  const statRows: Array<{
    label: string;
    values: [number | string, number | string];
  }> = [
    { label: "Shots", values: liveShots },
    { label: "On target", values: liveShotsOnTarget },
    {
      label: "Chance quality",
      values: liveExpectedGoals,
    },
    { label: "Yellow cards", values: liveYellowCards },
    { label: "Tactical control", values: result.stats.tacticalImpact },
  ];

  return (
    <section
      className={`match-broadcast ${styles.broadcast}`}
      aria-labelledby="match-live-heading"
      data-testid="match-broadcast"
    >
      <div className={styles.topbar}>
        <div className={styles.engineStatus}>
          <span className="live-dot">MATCH ENGINE LIVE</span>
          <span className={styles.seed}>SEED {result.seed}</span>
        </div>
        <div className={styles.controls} aria-label="Match timeline controls">
          <button
            className={`icon-button ${styles.controlButton}`}
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume match" : "Pause match"}
            disabled={complete}
          >
            {paused ? (
              <Play size={16} aria-hidden />
            ) : (
              <Pause size={16} aria-hidden />
            )}
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
            <small>{fast ? "2×" : "1×"}</small>
          </button>
          <button className={styles.skipButton} onClick={onSkip}>
            Skip to result <SkipForward size={14} aria-hidden />
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <TeamPanel
          side="user"
          teamName="Trophy XI"
          code="TXI"
          coach={userManager?.managerName}
          formation={formation?.id ?? "—"}
          lineup={userLineup}
          label="YOUR XI"
        />

        <div className={styles.center}>
          <section
            className={`${styles.scoreboard} ${
              opponent.kind === "all-stars" ? styles.mythicScoreboard : ""
            }`}
            data-testid="live-scoreboard"
            aria-label={`Trophy XI ${current.userScore}, ${opponentName} ${current.opponentScore}, ${current.minuteLabel}`}
          >
            <div className={styles.scoreTeam}>
              <small>YOUR XI</small>
              <b>Trophy XI</b>
            </div>
            <div className={styles.score}>
              <strong>{current.userScore}</strong>
              <span>{current.minuteLabel}</span>
              <strong>{current.opponentScore}</strong>
            </div>
            <div className={`${styles.scoreTeam} ${styles.scoreTeamRight}`}>
              <small>{opponentLabel}</small>
              <b>{opponentName}</b>
            </div>
            <div className={styles.possession}>
              <div>
                <b>{result.stats.possession[0]}%</b>
                <span>LIVE POSSESSION</span>
                <b>{result.stats.possession[1]}%</b>
              </div>
              <i aria-hidden>
                <span
                  style={{ width: `${result.stats.possession[0]}%` }}
                />
              </i>
            </div>
          </section>

          <section
            className={styles.stats}
            aria-labelledby="live-stats-heading"
          >
            <div className={styles.sectionHeading}>
              <h2 id="live-stats-heading">Live match stats</h2>
              <span>
                <b>TXI</b>
                <b>{opponent.kind === "all-stars" ? "ALL" : opponent.nationCode}</b>
              </span>
            </div>
            <div className={styles.statRows}>
              {statRows.map((stat) => (
                <div key={stat.label}>
                  <b>{stat.values[0]}</b>
                  <span>{stat.label}</span>
                  <b>{stat.values[1]}</b>
                </div>
              ))}
            </div>
          </section>

          <section
            className={styles.timeline}
            aria-labelledby="timeline-heading"
          >
            <div className={styles.sectionHeading}>
              <h2 id="timeline-heading">Match timeline</h2>
              <span>{index + 1} / {result.events.length}</span>
            </div>
            <div className={styles.commentaryStage}>
              <AnimatePresence initial={false} mode="popLayout">
                {visibleEvents.map((event, eventIndex) => (
                  <motion.article
                    key={event.id}
                    className={`${styles.event} ${
                      eventIndex === 0 ? styles.currentEvent : styles.pastEvent
                    } ${event.type === "goal" ? styles.goalEvent : ""}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{
                      opacity: eventIndex === 0 ? 1 : 0.48,
                      y: 0,
                    }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  >
                    <time>{event.minuteLabel}</time>
                    <div>
                      <h3
                        id={
                          eventIndex === 0 ? "match-live-heading" : undefined
                        }
                      >
                        {event.title}
                      </h3>
                      <p>{event.detail}</p>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
            {complete && (
              <div className={styles.finishAction}>
                <span>THE RECORD IS SEALED</span>
                <Button onClick={onSkip}>View final result</Button>
              </div>
            )}
          </section>
        </div>

        <TeamPanel
          side="opponent"
          teamName={opponentName}
          code={opponent.nationCode}
          coach={opponentManager?.managerName ?? opponent.managerName ?? undefined}
          formation={opponent.formation}
          lineup={opponentLineup}
          label={opponentLabel}
          mythic={opponent.kind === "all-stars"}
        />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {current.minuteLabel}. {current.title}. {current.detail} Score{" "}
        {current.userScore} to {current.opponentScore}.
      </p>
    </section>
  );
}
