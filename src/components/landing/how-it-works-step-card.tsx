"use client";

import {
  BrainCircuit,
  SlidersHorizontal,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./how-it-works-step-card.module.css";

const stepIcons = {
  stage: SlidersHorizontal,
  manager: BrainCircuit,
  squad: UsersRound,
  challenge: Trophy,
};

export type HowItWorksStepIcon = keyof typeof stepIcons;

export function HowItWorksStepCard({
  number,
  title,
  copy,
  icon,
}: {
  number: string;
  title: string;
  copy: string;
  icon: HowItWorksStepIcon;
}) {
  const Icon = stepIcons[icon];

  const updateGlow = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.pointerType === "touch" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--step-glow-x", `${event.clientX - bounds.left}px`);
    card.style.setProperty("--step-glow-y", `${event.clientY - bounds.top}px`);
    card.dataset.glowActive = "true";
  };

  return (
    <article
      className={styles.card}
      data-glow-active="false"
      onPointerEnter={updateGlow}
      onPointerMove={updateGlow}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") {
          event.currentTarget.dataset.glowActive = "false";
        }
      }}
      tabIndex={0}
    >
      <div className={styles.meta}>
        <span>{number}</span>
        <i aria-hidden>
          <Icon size={25} strokeWidth={1.75} />
        </i>
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
