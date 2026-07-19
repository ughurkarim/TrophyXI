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
  const gameMode = useGameStore((state) => state.gameMode);
  const eraId = useGameStore((state) => state.eraId);
  const managerId = useGameStore((state) => state.managerId);
  const formationId = useGameStore((state) => state.formationId);
  const matchResult = useGameStore((state) => state.matchResult);
  const worldCupRun = useGameStore((state) => state.worldCupRun);
  const selectGameMode = useGameStore((state) => state.selectGameMode);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">OPENING MATCH MODES</p>
      </main>
    );
  }

  const resumeRoute = matchResult
    ? "/result"
    : gameMode === "world-cup-run" && worldCupRun
      ? "/play/world-cup-run"
    : !eraId
      ? "/play/era"
      : !managerId
        ? "/play/manager"
        : !formationId
          ? "/play/formation"
          : gameMode === "free-selection"
            ? "/play/free-selection"
            : "/play/draft";
  const savedMode = modes.find((mode) => mode.id === gameMode);

  return (
    <div className="game-page game-page--stadium">
      <GameHeader step="MODE / 00" />
      <main className={`container game-main ${styles.main}`}>
        <section className={styles.screen} aria-labelledby="mode-title">
          <div className={styles.intro}>
            <p className="eyebrow eyebrow--gold">THE TROPHY ROOM</p>
            <h1 id="mode-title">Choose your challenge.</h1>
            <p>
              Draft under pressure, assemble your own archive XI, or chase the
              trophy across a complete tournament.
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
                  <span>
                    <strong>{mode.title}</strong>
                    <small id={`${mode.id}-description`}>{mode.subtitle}</small>
                  </span>
                  <span className={styles.cardState} aria-hidden>
                    {isSelected ? <Check size={18} /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.confirm}>
            <span aria-live="polite">
              <small>SELECTED MODE</small>
              <strong>
                {pendingModeId
                  ? modes.find((mode) => mode.id === pendingModeId)?.title
                  : "CHOOSE A MODE ABOVE"}
              </strong>
            </span>
            <Button
              disabled={!pendingModeId}
              onClick={() => {
                if (!pendingModeId) return;
                selectGameMode(pendingModeId);
                router.push("/play/era");
              }}
            >
              {pendingModeId
                ? `CONFIRM ${
                    modes.find((mode) => mode.id === pendingModeId)?.title
                  }`
                : "CONFIRM SELECTION"}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </div>

          {savedMode && (
            <div className={styles.resume}>
              <span>
                <small>SAVED RUN</small>
                <strong>{savedMode.title}</strong>
              </span>
              <Button onClick={() => router.push(resumeRoute)}>
                RESUME {savedMode.title}
                <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
