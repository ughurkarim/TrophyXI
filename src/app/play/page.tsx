"use client";

import {
  ArrowRight,
  Check,
  Dices,
  ListChecks,
  Star,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";
import type { GameMode } from "@/types/game";
import styles from "./play-page.module.css";

type ModeConfig = {
  id: GameMode;
  number: string;
  title: string;
  emotion: string;
  statement: string;
  description: string;
  traits: [string, string, string];
  cta: string;
  icon: typeof Dices;
  playerImage: string;
  fanFavorite?: boolean;
};

const modes: ModeConfig[] = [
  {
    id: "classic-draft",
    number: "01",
    title: "CLASSIC DRAFT",
    emotion: "PRESSURE",
    statement: "Trust your instincts.",
    description:
      "Five-card offers. Limited choices. Build greatness from whatever the archive puts in front of you.",
    traits: ["5-CARD OFFERS", "LIMITED CONTROL", "EVERY PICK MATTERS"],
    cta: "ENTER THE DRAFT",
    icon: Dices,
    playerImage: "/modes/classic-player.png",
  },
  {
    id: "free-selection",
    number: "02",
    title: "FREE SELECTION",
    emotion: "CONTROL",
    statement: "Build the XI in your head.",
    description:
      "The archive is yours. Choose every player, every era, your manager, your shape, and your opponent.",
    traits: ["ANY PLAYER", "ANY ERA", "TOTAL CONTROL"],
    cta: "BUILD YOUR XI",
    icon: ListChecks,
    playerImage: "/modes/free-player.png",
  },
  {
    id: "world-cup-run",
    number: "03",
    title: "WORLD CUP RUN",
    emotion: "SURVIVAL",
    statement: "One squad. One run. One chance.",
    description:
      "Take your XI onto the world stage. Survive the group, conquer the knockouts, and reach the Final.",
    traits: ["48 TEAMS", "KNOCKOUT FOOTBALL", "1 CHAMPION"],
    cta: "BEGIN THE RUN",
    icon: Trophy,
    playerImage: "/modes/worldcup-player.png",
    fanFavorite: true,
  },
];

const mobileModes = modes.filter((mode) => mode.id !== "free-selection");
const mobileModeDescriptions: Partial<Record<GameMode, string>> = {
  "classic-draft": "Five-card offers. Build greatness from limited choices.",
  "world-cup-run":
    "Build your XI. Survive the group and conquer the knockout rounds.",
};

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

  const continueWithMode = () => {
    if (!pendingModeId) return;
    selectGameMode(pendingModeId);
    router.push("/play/era");
  };

  return (
    <div className={`game-page game-page--stadium ${styles.page}`}>
      <GameHeader step="MODE / 00" />

      <main className={`container game-main ${styles.main}`}>
        <section className={`${styles.screen} ${styles.desktopScreen}`} aria-labelledby="mode-title">
          <div className={styles.atmosphere} aria-hidden />
          <div className={styles.crownGlow} aria-hidden />

          <header className={styles.intro}>
            <h1 id="mode-title">How will you build your XI?</h1>
          </header>

          <div
            className={`${styles.modeGrid} ${
              pendingModeId ? styles.modeGridHasSelection : ""
            }`}
            role="group"
            aria-label="Choose a game mode"
          >
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = mode.id === pendingModeId;

              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`${styles.modeCard} ${
                    isSelected ? styles.modeCardSelected : ""
                  }`}
                  data-mode={mode.id}
                  aria-pressed={isSelected}
                  aria-describedby={`${mode.id}-description`}
                  onClick={() => setPendingModeId(mode.id)}
                >
                  <span className={styles.modeNumber} aria-hidden>
                    {mode.number}
                  </span>

                  <span className={styles.modeAtmosphere} aria-hidden />
                  <span className={styles.playerWrap} aria-hidden>
                    <img
                      src={mode.playerImage}
                      alt=""
                      className={styles.playerImage}
                    />
                  </span>

                  <span className={styles.imageFade} aria-hidden />
                  <span className={styles.goldSweep} aria-hidden />

                  <span className={styles.topRail}>
                    <span className={styles.icon}>
                      <Icon size={21} strokeWidth={1.65} />
                    </span>
                    <span className={styles.emotion}>{mode.emotion}</span>
                    {mode.fanFavorite ? (
                      <span className={styles.fanFavorite}>
                        <Star size={10} fill="currentColor" aria-hidden />
                        FAN FAVORITE
                      </span>
                    ) : null}
                  </span>

                  <span className={styles.copy}>
                    <span className={styles.modeTitle}>{mode.title}</span>
                    <span className={styles.statement}>{mode.statement}</span>
                    <span
                      className={styles.description}
                      id={`${mode.id}-description`}
                    >
                      {mode.description}
                    </span>
                  </span>

                  <span className={styles.traitRail}>
                    {mode.traits.map((trait, index) => (
                      <span key={trait}>
                        <i>{String(index + 1).padStart(2, "0")}</i>
                        {trait}
                      </span>
                    ))}
                  </span>

                  <span className={styles.selectLine}>
                    <span>
                      {isSelected ? (
                        <>
                          <Check size={12} strokeWidth={2.6} />
                          SELECTED
                        </>
                      ) : (
                        "SELECT MODE"
                      )}
                    </span>
                    <ArrowRight size={14} aria-hidden />
                  </span>

                  <span className={styles.bottomLight} aria-hidden />
                </button>
              );
            })}
          </div>

          <footer className={styles.actionBar}>
            <div className={styles.actionIdentity}>
              <span>YOUR PATH</span>
              <strong>
                {selectedMode?.title ?? "CHOOSE ONE OF THREE WAYS TO PLAY"}
              </strong>
            </div>

            <div className={styles.actionQuote}>
              {selectedMode ? (
                <>
                  <span>{selectedMode.emotion}</span>
                  <strong>{selectedMode.statement}</strong>
                </>
              ) : (
                <>
                  <span>TROPHY XI</span>
                  <strong>Every great XI starts with a decision.</strong>
                </>
              )}
            </div>

            <Button
              className={styles.actionButton}
              disabled={!pendingModeId}
              onClick={continueWithMode}
            >
              {selectedMode?.cta ?? "SELECT A MODE"}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </footer>
        </section>

        <section
          className={styles.mobileScreen}
          aria-labelledby="mobile-mode-title"
          data-testid="mobile-mode-screen"
        >
          <header className={styles.mobileIntro}>
            <p>CHOOSE YOUR PATH</p>
            <h1 id="mobile-mode-title">How will you build your XI?</h1>
            <span>Pick a mode, then start with the era.</span>
          </header>

          <div className={styles.mobileModes} role="group" aria-label="Choose a game mode">
            {mobileModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = mode.id === pendingModeId;
              return (
                <button
                  key={`mobile-${mode.id}`}
                  type="button"
                  className={styles.mobileMode}
                  data-mode={mode.id}
                  data-selected={isSelected ? "true" : undefined}
                  aria-pressed={isSelected}
                  onClick={() => setPendingModeId(mode.id)}
                >
                  <span className={styles.mobileModeIcon}><Icon size={20} aria-hidden /></span>
                  <span
                    className={styles.mobileModePlayer}
                    data-testid="mobile-mode-player"
                    aria-hidden
                  >
                    <img src={mode.playerImage} alt="" />
                  </span>
                  <span className={styles.mobileModeCopy} data-testid="mobile-mode-copy">
                    {mode.fanFavorite ? (
                      <span className={styles.fanFavorite}>
                        <Star size={9} fill="currentColor" aria-hidden />
                        FAN FAVORITE
                      </span>
                    ) : null}
                    <small>{mode.emotion} · {mode.traits[0]}</small>
                    <strong>{mode.title}</strong>
                    <span>{mobileModeDescriptions[mode.id] ?? mode.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <footer className={styles.mobileAction} data-testid="mobile-mode-action">
            <span>
              <small>{selectedMode ? "SELECTED" : "YOUR PATH"}</small>
              <strong>{selectedMode?.title ?? "Choose one mode"}</strong>
            </span>
            <Button disabled={!pendingModeId} onClick={continueWithMode}>
              {selectedMode?.cta ?? "SELECT MODE"}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </footer>
        </section>
      </main>
    </div>
  );
}
