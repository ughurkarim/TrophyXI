"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { draftEras } from "@/data/eras";
import { players } from "@/data/players";
import { useGameStore } from "@/store/game-store";

export default function EraPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
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
      <main className="container game-main">
        <section className="era-page" aria-labelledby="era-title">
          <div className="game-intro">
            <p className="eyebrow eyebrow--gold">THE GRAND ARCHIVE / STEP 01</p>
            <h1 id="era-title">Choose the match environment.</h1>
            <p>
              Every tournament card from 1970–2022 remains draftable. Your choice
              defines the conditions in which both your squad and the historical
              opponent must translate their football.
            </p>
          </div>
          <div className="era-grid era-grid--flow">
            {draftEras.map((era) => {
              return (
                <button
                  key={era.id}
                  className={`era-card ${era.themeClass}`}
                  onClick={() => {
                    selectEra(era.id);
                    router.push("/play/manager");
                  }}
                  aria-label={`Choose ${era.label}, ${era.years}`}
                >
                  <span>{era.accent}</span>
                  <b>{era.years}</b>
                  <h2>{era.label}</h2>
                  <p>{era.description}</p>
                  <footer>
                    <small>{players.length} cards remain available</small>
                    <ArrowRight size={17} aria-hidden />
                  </footer>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
