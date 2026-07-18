"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { PointerEvent } from "react";
import { PlayerCard } from "@/components/cards/player-card";
import { playersById } from "@/data/players";

const featured = [
  playersById.get("zinedine-zidane-1998")!,
  playersById.get("ronaldo-2002")!,
  playersById.get("lionel-messi-2022")!,
];

export function HeroShowcase() {
  const reduceMotion = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 90, damping: 20 });
  const y = useSpring(rawY, { stiffness: 90, damping: 20 });

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    rawX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 12);
    rawY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 9);
  };

  return (
    <motion.div
      className="hero-showcase"
      onPointerMove={handlePointer}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
      style={{ rotateY: x, rotateX: y }}
      aria-label="Featured tournament cards: Zidane 1998, Ronaldo 2002, and Messi 2022"
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
        <b>1998 — 2022</b>
      </div>
    </motion.div>
  );
}
