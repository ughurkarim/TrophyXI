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
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";
import type { GameMode } from "@/types/game";
import styles from "./play-page.module.css";

type ModeConfig = {
  id: GameMode;
  translationKey: "classic" | "free" | "run";
  number: string;
  icon: typeof Dices;
  playerImage: string;
  fanFavorite?: boolean;
};

const modes: ModeConfig[] = [
  {
    id: "classic-draft",
    translationKey: "classic",
    number: "01",
    icon: Dices,
    playerImage: "/modes/classic-player.png",
  },
  {
    id: "free-selection",
    translationKey: "free",
    number: "02",
    icon: ListChecks,
    playerImage: "/modes/free-player.png",
  },
  {
    id: "world-cup-run",
    translationKey: "run",
    number: "03",
    icon: Trophy,
    playerImage: "/modes/worldcup-player.png",
    fanFavorite: true,
  },
];

const mobileModes = modes.filter((mode) => mode.id !== "free-selection");
export default function PlayPage() {
  const router = useRouter();
  const t = useTranslations("gameSetup.mode");
  const [pendingModeId, setPendingModeId] = useState<GameMode | null>(null);
  const hydrated = useGameStore((state) => state.hasHydrated);
  const selectGameMode = useGameStore((state) => state.selectGameMode);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">{t("loading")}</p>
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
      <GameHeader step={t("step")} />

      <main className={`container game-main ${styles.main}`}>
        <section className={`${styles.screen} ${styles.desktopScreen}`} aria-labelledby="mode-title">
          <div className={styles.atmosphere} aria-hidden />
          <div className={styles.crownGlow} aria-hidden />

          <header className={styles.intro}>
            <h1 id="mode-title">{t("title")}</h1>
          </header>

          <div
            className={`${styles.modeGrid} ${
              pendingModeId ? styles.modeGridHasSelection : ""
            }`}
            role="group"
            aria-label={t("chooseAria")}
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
                    <span className={styles.emotion}>{t(`options.${mode.translationKey}.emotion`)}</span>
                    {mode.fanFavorite ? (
                      <span className={styles.fanFavorite}>
                        <Star size={10} fill="currentColor" aria-hidden />
                        {t("fanFavorite")}
                      </span>
                    ) : null}
                  </span>

                  <span className={styles.copy}>
                    <span className={styles.modeTitle}>{t(`options.${mode.translationKey}.title`)}</span>
                    <span className={styles.statement}>{t(`options.${mode.translationKey}.statement`)}</span>
                    <span
                      className={styles.description}
                      id={`${mode.id}-description`}
                    >
                      {t(`options.${mode.translationKey}.description`)}
                    </span>
                  </span>

                  <span className={styles.traitRail}>
                    {[0, 1, 2].map((index) => (
                      (() => {
                        const trait = t(`options.${mode.translationKey}.traits.${index}`);
                        return (
                      <span key={trait}>
                        <i>{String(index + 1).padStart(2, "0")}</i>
                        {trait}
                      </span>
                        );
                      })()
                    ))}
                  </span>

                  <span className={styles.selectLine}>
                    <span>
                      {isSelected ? (
                        <>
                          <Check size={12} strokeWidth={2.6} />
                          {t("selected")}
                        </>
                      ) : (
                        t("selectMode")
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
              <span>{t("yourPath")}</span>
              <strong>
                {selectedMode
                  ? t(`options.${selectedMode.translationKey}.title`)
                  : t("chooseThree")}
              </strong>
            </div>

            <div className={styles.actionQuote}>
              {selectedMode ? (
                <>
                  <span>{t(`options.${selectedMode.translationKey}.emotion`)}</span>
                  <strong>{t(`options.${selectedMode.translationKey}.statement`)}</strong>
                </>
              ) : (
                <>
                  <span>TROPHY XI</span>
                  <strong>{t("decision")}</strong>
                </>
              )}
            </div>

            <Button
              className={styles.actionButton}
              disabled={!pendingModeId}
              onClick={continueWithMode}
            >
              {selectedMode ? t(`options.${selectedMode.translationKey}.cta`) : t("selectAMode")}
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
            <p>{t("choosePath")}</p>
            <h1 id="mobile-mode-title">{t("title")}</h1>
            <span>{t("mobileHint")}</span>
          </header>

          <div className={styles.mobileModes} role="group" aria-label={t("chooseAria")}>
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
                        {t("fanFavorite")}
                      </span>
                    ) : null}
                    <small>{t(`options.${mode.translationKey}.emotion`)} · {t(`options.${mode.translationKey}.traits.0`)}</small>
                    <strong>{t(`options.${mode.translationKey}.title`)}</strong>
                    <span>{t(`options.${mode.translationKey}.mobileDescription`)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <footer className={styles.mobileAction} data-testid="mobile-mode-action">
            <span>
              <small>{selectedMode ? t("selected") : t("yourPath")}</small>
              <strong>{selectedMode ? t(`options.${selectedMode.translationKey}.title`) : t("chooseOne")}</strong>
            </span>
            <Button disabled={!pendingModeId} onClick={continueWithMode}>
              {selectedMode ? t(`options.${selectedMode.translationKey}.cta`) : t("selectMode")}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </footer>
        </section>
      </main>
    </div>
  );
}
