"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import { draftEras } from "@/data/eras";
import { useGameStore } from "@/store/game-store";
import type { DraftEraId } from "@/types/game";
import styles from "./era-page.module.css";

const eraThemeClasses: Record<DraftEraId, string> = {
  "2020s": styles.theme2020s,
  "2010s": styles.theme2010s,
  "2000s": styles.theme2000s,
  "1990s": styles.theme1990s,
  "1980s": styles.theme1980s,
  "1970s": styles.theme1970s,
  all: styles.themeNeutral,
};

const eraIdentity: Record<DraftEraId, string> = {
  "2020s": "THE MODERN GAME",
  "2010s": "THE TACTICAL AGE",
  "2000s": "THE GALÁCTICO ERA",
  "1990s": "THE LAST ROMANTICS",
  "1980s": "THE PLAYMAKERS",
  "1970s": "TOTAL FOOTBALL",
  all: "TIMELESS",
};

export default function EraPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const selectedEraId = useGameStore((state) => state.eraId);
  const selectEra = useGameStore((state) => state.selectEra);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">OPENING THE GRAND ARCHIVE</p>
      </main>
    );
  }

  const selectedEra = draftEras.find((era) => era.id === selectedEraId);

  return (
    <div className={`game-page game-page--stadium ${styles.page}`}>
      <GameHeader step="ERA / 01" />
      <SaveNotice />

      <main className={`container game-main ${styles.main}`}>
        <section
          className={`${styles.eraScreen} ${styles.desktopEraScreen} era-page`}
          aria-labelledby="era-title"
        >
          <div className={styles.archiveHalo} aria-hidden />
          <div className={styles.archiveBeamLeft} aria-hidden />
          <div className={styles.archiveBeamRight} aria-hidden />
          <div className={styles.archiveDust} aria-hidden />

          <header className={styles.intro}>
            <p className="eyebrow eyebrow--gold">
              THE GRAND ARCHIVE / STEP 01
            </p>
            <h1 id="era-title">Choose your era.</h1>
            <p>
              Every generation changed the game. Choose the football world your
              XI must conquer — every player remains available, but each era
              changes how their qualities translate.
            </p>
          </header>

          <div className={styles.grid} role="group" aria-label="Choose your era">
            {draftEras.map((era, index) => {
              const isSelected = selectedEraId === era.id;

              return (
                <button
                  key={era.id}
                  type="button"
                  className={`${styles.card} ${eraThemeClasses[era.id]} ${
                    isSelected ? styles.selected : ""
                  }`}
                  onClick={() => selectEra(era.id)}
                  aria-label={`Choose ${era.label}, ${era.years}`}
                  aria-pressed={isSelected}
                >
                  <div className={styles.cardAtmosphere} aria-hidden>
                    <span className={styles.innerGlow} />
                    <span className={styles.topBeam} />
                    <span className={styles.cardGrid} />
                  </div>

                  <div className={styles.cardContent}>
                    <span className={styles.cardNumber} aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className={styles.themeLabel}>
                      {eraIdentity[era.id]}
                    </span>

                    <div className={styles.cardBody}>
                      <h2>{era.label}</h2>
                      <p>{era.description}</p>
                    </div>

                    <div className={styles.action} aria-hidden="true">
                      <span>
                        {isSelected ? (
                          <>
                            <Check size={13} strokeWidth={2.5} />
                            SELECTED
                          </>
                        ) : (
                          "SELECT"
                        )}
                      </span>
                      <ArrowRight size={14} strokeWidth={1.8} />
                    </div>
                  </div>

                  <span className={styles.bottomGlow} aria-hidden />
                </button>
              );
            })}
          </div>

          <div className={styles.commandBar}>
            <div className={styles.commandSelection}>
              <span>{selectedEra ? "SELECTED ERA" : "THE GRAND ARCHIVE"}</span>
              <strong>{selectedEra?.label ?? "Choose a football generation"}</strong>
            </div>

            <div className={styles.commandContext}>
              <span>
                {selectedEra ? eraIdentity[selectedEra.id] : "ERA EFFECT"}
              </span>
              <strong>
                {selectedEra
                  ? selectedEra.description
                  : "Your era changes the match environment, not the player pool."}
              </strong>
            </div>

            <Button
              className={styles.selectButton}
              disabled={!selectedEraId}
              onClick={() => router.push("/play/manager")}
            >
              SELECT ERA
              <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </section>

        <section
          className={styles.mobileEraScreen}
          aria-labelledby="mobile-era-title"
          data-testid="mobile-era-screen"
        >
          <header className={styles.mobileIntro}>
            <p>STEP 01 · MATCH ENVIRONMENT</p>
            <h1 id="mobile-era-title">Choose your era.</h1>
            <span>Every player stays available. The environment changes how each quality translates.</span>
          </header>

          <div
            className={styles.mobileEraList}
            role="group"
            aria-label="Choose your era"
            data-testid="mobile-era-list"
          >
            {draftEras.map((era) => {
              const isSelected = selectedEraId === era.id;
              return (
                <button
                  key={`mobile-${era.id}`}
                  type="button"
                  className={`${styles.mobileEra} ${eraThemeClasses[era.id]}`}
                  data-selected={isSelected ? "true" : undefined}
                  aria-label={`Choose ${era.label}, ${era.years}`}
                  aria-pressed={isSelected}
                  onClick={() => selectEra(era.id)}
                >
                  <span className={styles.mobileEraYears}>{era.years}</span>
                  <span className={styles.mobileEraCopy}>
                    <small>{eraIdentity[era.id]}</small>
                    <strong>{era.label}</strong>
                    <span>{era.description}</span>
                  </span>
                  <span className={styles.mobileEraSelect} aria-hidden>
                    {!isSelected && <ArrowRight size={17} />}
                  </span>
                </button>
              );
            })}
          </div>

          <footer className={styles.mobileCommand} data-testid="mobile-era-command">
            <span>
              <small>{selectedEra ? "SELECTED ERA" : "MATCH ERA"}</small>
              <strong>{selectedEra?.label ?? "Choose one era"}</strong>
            </span>
            <Button disabled={!selectedEraId} onClick={() => router.push("/play/manager")}>
              Continue <ArrowRight size={16} aria-hidden />
            </Button>
          </footer>
        </section>
      </main>
    </div>
  );
}
