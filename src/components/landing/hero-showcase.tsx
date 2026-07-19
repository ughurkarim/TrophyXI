"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { PlayerCard } from "@/components/cards/player-card";
import { playersById } from "@/data/players";
import styles from "./hero-showcase.module.css";

export const HERO_TOURNAMENT_YEARS = [
  2026, 2022, 2018, 2014, 2010, 2006,
] as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const heroYearIndexForProgress = (progress: number) =>
  Math.min(
    HERO_TOURNAMENT_YEARS.length - 1,
    Math.floor(
      clamp(progress, 0, 0.999_999) * HERO_TOURNAMENT_YEARS.length,
    ),
  );

export const heroReducedMotionYearIndexForProgress = (progress: number) =>
  progress < 0.5 ? 0 : HERO_TOURNAMENT_YEARS.length - 1;

const cardsByYear = new Map(
  HERO_TOURNAMENT_YEARS.map((year) => [
    year,
    {
      messi: playersById.get(`lionel-messi-${year}`)!,
      ronaldo: playersById.get(`cristiano-ronaldo-${year}`)!,
    },
  ]),
);

export const heroCardsForYear = (year: (typeof HERO_TOURNAMENT_YEARS)[number]) =>
  cardsByYear.get(year)!;

function RivalCard({
  side,
  player,
  reduceMotion,
}: {
  side: "messi" | "ronaldo";
  player: NonNullable<ReturnType<typeof playersById.get>>;
  reduceMotion: boolean;
}) {
  return (
    <div className={styles.rivalSlot}>
      <AnimatePresence initial={false}>
        <motion.div
          key={player.id}
          className={`hero-rival-card hero-rival-card--${side}`}
          data-card-id={player.id}
          initial={
            reduceMotion
              ? false
              : { opacity: 0, y: 28, filter: "blur(7px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -24, filter: "blur(7px)" }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <PlayerCard
            player={player}
            decorative
            className={`hero-card hero-card--${side}`}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function HeroShowcase({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const nextIndex = reduceMotion
      ? heroReducedMotionYearIndexForProgress(progress)
      : heroYearIndexForProgress(progress);
    setActiveIndex((current) =>
      current === nextIndex ? current : nextIndex,
    );
  });

  const year = HERO_TOURNAMENT_YEARS[activeIndex];
  const cards = heroCardsForYear(year);

  return (
    <div
      ref={sceneRef}
      className="hero-scroll-scene"
      data-testid="hero-scroll-scene"
    >
      <div className="hero-scroll-sticky">
        <div className="hero__glow" aria-hidden />
        <div className="container hero__grid">
          {children}
          <div
            className="hero-showcase"
            data-testid="hero-showcase"
            data-active-year={year}
            tabIndex={0}
            aria-label={`Ronaldo and Messi tournament-card timeline, showing ${year}. Scroll sequence: 2026, 2022, 2018, 2014, 2010, 2006.`}
          >
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              Showing {year}
            </div>

            <span className="hero-background-year" aria-hidden>
              {year}
            </span>

            <div
              className={`hero-transition-label ${styles.transitionLabel}`}
              aria-hidden
            >
              <span>SIX TOURNAMENTS · TWENTY YEARS</span>
              <strong>2026 → 2006</strong>
            </div>

            <div className="hero-rival-cards">
              <RivalCard
                side="messi"
                player={cards.messi}
                reduceMotion={reduceMotion}
              />
              <RivalCard
                side="ronaldo"
                player={cards.ronaldo}
                reduceMotion={reduceMotion}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
