"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { PointerEvent } from "react";
import { PlayerCard } from "@/components/cards/player-card";
import { playersById } from "@/data/players";

const featured = [
  playersById.get("pele-1970")!,
  playersById.get("lionel-messi-2022")!,
  playersById.get("cristiano-ronaldo-2018")!,
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type HeroTransform = {
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
};

export const stableHeroTransform = (
  pointerX: number,
  pointerY: number,
  bounds: { left: number; top: number; width: number; height: number },
): HeroTransform => {
  const normalizedX = clamp(
    (pointerX - bounds.left) / Math.max(1, bounds.width) - 0.5,
    -0.5,
    0.5,
  );
  const normalizedY = clamp(
    (pointerY - bounds.top) / Math.max(1, bounds.height) - 0.5,
    -0.5,
    0.5,
  );
  return {
    x: clamp(normalizedX * 16, -8, 8),
    y: clamp(normalizedY * 12, -6, 6),
    rotateX: clamp(normalizedY * -7, -3.5, 3.5),
    rotateY: clamp(normalizedX * 8, -4, 4),
  };
};

export const pointerParallaxEnabled = (
  pointerType: string,
  reducedMotion: boolean,
) => pointerType === "mouse" && !reducedMotion;

export function HeroShowcase() {
  const reduceMotion = Boolean(useReducedMotion());
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const spring = { stiffness: 110, damping: 24, mass: 0.65 };
  const x = useSpring(rawX, spring);
  const y = useSpring(rawY, spring);
  const rotateX = useSpring(rawRotateX, spring);
  const rotateY = useSpring(rawRotateY, spring);

  const resetTransform = () => {
    rawX.set(0);
    rawY.set(0);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerParallaxEnabled(event.pointerType, reduceMotion)) {
      resetTransform();
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = stableHeroTransform(event.clientX, event.clientY, bounds);
    rawX.set(next.x);
    rawY.set(next.y);
    rawRotateX.set(next.rotateX);
    rawRotateY.set(next.rotateY);
  };

  return (
    <motion.div
      className="hero-showcase"
      data-testid="hero-showcase"
      onPointerMove={handlePointer}
      onPointerLeave={resetTransform}
      onFocus={resetTransform}
      onBlur={resetTransform}
      tabIndex={0}
      style={reduceMotion ? undefined : { x, y, rotateX, rotateY }}
      aria-label="Featured tournament cards: Pelé 1970, Messi 2022, and Cristiano Ronaldo 2018"
    >
      <div className="hero-pitch" aria-hidden>
        <span className="hero-pitch__line" />
        <span className="hero-pitch__circle" />
        <span className="hero-pitch__corner" />
      </div>
      <span className="showcase-label">ARCHIVE SELECTION / 03</span>
      {featured.map((player, index) => (
        <PlayerCard
          key={player.id}
          player={player}
          decorative
          className={`hero-card hero-card--${index + 1}`}
        />
      ))}
      <div className="showcase-plaque">
        <span>CURATED PERFORMANCES</span>
        <b>1970 — 2022</b>
      </div>
    </motion.div>
  );
}
