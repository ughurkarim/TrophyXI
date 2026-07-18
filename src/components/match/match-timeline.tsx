"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FastForward, Pause, Play, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Champion, MatchResult } from "@/types/game";

export function MatchTimeline({
  result,
  opponent,
  onSkip,
}: {
  result: MatchResult;
  opponent: Champion;
  onSkip: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(reduceMotion ? result.events.length - 1 : 0);
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

  return (
    <section className="match-broadcast" aria-labelledby="match-live-heading">
      <div className="broadcast-topbar">
        <div>
          <span className="live-dot">MATCH ENGINE LIVE</span>
          <span className="broadcast-seed">SEED {result.seed}</span>
        </div>
        <div className="timeline-controls" aria-label="Match timeline controls">
          <button
            className="icon-button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume match" : "Pause match"}
            disabled={complete}
          >
            {paused ? <Play size={17} aria-hidden /> : <Pause size={17} aria-hidden />}
          </button>
          <button
            className={`icon-button ${fast ? "is-active" : ""}`}
            onClick={() => setFast((value) => !value)}
            aria-label="Fast forward"
            aria-pressed={fast}
            disabled={complete}
          >
            <FastForward size={17} aria-hidden />
          </button>
          <button className="text-button" onClick={onSkip}>
            Skip to result <SkipForward size={15} aria-hidden />
          </button>
        </div>
      </div>

      <div className="scoreboard">
        <div className="scoreboard__team">
          <span>YOUR XI</span>
          <b>Trophy XI</b>
        </div>
        <div className="scoreboard__score" aria-label={`Trophy XI ${current.userScore}, Spain ${current.opponentScore}`}>
          <strong>{current.userScore}</strong>
          <span>{current.minuteLabel}</span>
          <strong>{current.opponentScore}</strong>
        </div>
        <div className="scoreboard__team scoreboard__team--right">
          <span>CHAMPION</span>
          <b>{opponent.countryName} {opponent.year}</b>
        </div>
      </div>

      <div className="possession-strip">
        <span style={{ width: `${result.stats.possession[0]}%` }} />
        <div>
          <b>{result.stats.possession[0]}%</b>
          <small>LIVE POSSESSION</small>
          <b>{result.stats.possession[1]}%</b>
        </div>
      </div>

      <div className="commentary-stage">
        <AnimatePresence mode="popLayout">
          {visibleEvents.map((event, eventIndex) => (
            <motion.article
              key={event.id}
              className={`commentary-event commentary-event--${event.type} ${
                eventIndex === 0 ? "commentary-event--current" : ""
              }`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: eventIndex === 0 ? 1 : 0.42, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <time>{event.minuteLabel}</time>
              <div>
                <h2 id={eventIndex === 0 ? "match-live-heading" : undefined}>{event.title}</h2>
                <p>{event.detail}</p>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {current.minuteLabel}. {current.title}. {current.detail} Score {current.userScore} to{" "}
        {current.opponentScore}.
      </p>

      {complete && (
        <div className="broadcast-finish">
          <span className="eyebrow eyebrow--gold">THE RECORD IS SEALED</span>
          <Button onClick={onSkip}>View final result</Button>
        </div>
      )}
    </section>
  );
}
