"use client";

import { ArrowRight, Check, Dices, ListChecks, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";
import type { GameMode } from "@/types/game";
import styles from "./play-page.module.css";

const modes: Array<{
  id: GameMode;
  title: string;
  subtitle: string;
  icon: typeof Dices;
}> = [
  {
    id: "classic-draft",
    title: "CLASSIC DRAFT",
    subtitle: "Build your squad through five-card tournament offers.",
    icon: Dices,
  },
  {
    id: "free-selection",
    title: "FREE SELECTION",
    subtitle: "Choose any players, manager, formation, era, and opponent.",
    icon: ListChecks,
  },
  {
    id: "world-cup-run",
    title: "WORLD CUP RUN",
    subtitle: "Survive the group stage and fight through the knockout rounds.",
    icon: Trophy,
  },
];

export default function PlayPage() {
  const router = useRouter();
  const [pendingModeId, setPendingModeId] = useState<GameMode | null>(null);
  const hydrated = useGameStore((state) => state.hasHydrated);
  const selectGameMode = useGameStore((state) => state.selectGameMode);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">OPENING MATCH MODES</p>
      </main>
    );
  }

  const selectedMode = modes.find((mode) => mode.id === pendingModeId);

  return (
    <div className="game-page game-page--stadium">
      <GameHeader step="MODE / 00" />
      <main className={`container game-main ${styles.main}`}>
        <section
          className={styles.screen}
          aria-labelledby="mode-title"
        >
          <div className={styles.intro}>
            <p className="eyebrow eyebrow--gold">CHOOSE YOUR MODE</p>
            <h1 id="mode-title">How will you build your XI?</h1>
            <p>
              Draft under pressure, select your team freely, or take your XI
              through a complete World Cup run.
            </p>
          </div>

          <div
            className={styles.grid}
            role="group"
            aria-label="Choose a game mode"
          >
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = mode.id === pendingModeId;
              return (
                <button
                  type="button"
                  key={mode.id}
                  className={`${styles.modeCard} ${
                    isSelected ? styles.modeCardSelected : ""
                  }`}
                  aria-pressed={isSelected}
                  aria-describedby={`${mode.id}-description`}
                  onClick={() => setPendingModeId(mode.id)}
                >
                  <span className={styles.icon} aria-hidden>
                    <Icon size={25} />
                  </span>
                  <span className={styles.cardCopy}>
                    <strong>{mode.title}</strong>
                    <small id={`${mode.id}-description`}>{mode.subtitle}</small>
                  </span>
                  {isSelected && (
                    <span className={styles.selectedBadge} aria-hidden>
                      <Check size={13} strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.actionRow}>
            <strong aria-live="polite">
              {selectedMode?.title ?? "Choose a mode"}
            </strong>
            <Button
              disabled={!pendingModeId}
              onClick={() => {
                if (!pendingModeId) return;
                selectGameMode(pendingModeId);
                router.push("/play/era");
              }}
            >
              CONTINUE
              <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
