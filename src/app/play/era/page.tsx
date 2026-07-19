"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
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

  return (
    <div className="game-page game-page--stadium">
      <GameHeader step="ERA / 01" />
      <SaveNotice />
      <main className={`container game-main ${styles.main}`}>
        <section
          className={`${styles.eraScreen} era-page`}
          aria-labelledby="era-title"
        >
          <div className={styles.intro}>
            <p className="eyebrow eyebrow--gold">THE GRAND ARCHIVE / STEP 01</p>
            <h1 id="era-title">Choose your era.</h1>
            <p>
              The era sets the style and conditions of the match. Every player
              remains available, but their pace, technique, physicality,
              tactics, and overall fit may translate differently.
            </p>
          </div>
          <div className={styles.grid}>
            {draftEras.map((era) => {
              const isSelected = selectedEraId === era.id;

              return (
                <button
                  key={era.id}
                  className={`era-card ${styles.card} ${eraThemeClasses[era.id]} ${
                    isSelected ? styles.selected : ""
                  }`}
                  onClick={() => {
                    selectEra(era.id);
                    router.push("/play/manager");
                  }}
                  aria-label={`Choose ${era.label}, ${era.years}`}
                  aria-pressed={isSelected}
                >
                  <span className={styles.themeLabel}>{era.accent}</span>
                  <b className={styles.yearRange}>{era.years}</b>
                  <h2>{era.label}</h2>
                  <p>{era.description}</p>
                  <span className={styles.action} aria-hidden="true">
                    {isSelected ? (
                      <>
                        <Check size={14} strokeWidth={2.25} />
                        Selected
                      </>
                    ) : (
                      "Select era"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
