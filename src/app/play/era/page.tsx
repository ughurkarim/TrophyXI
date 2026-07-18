"use client";

import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { draftEras } from "@/data/eras";
import { draftEligiblePlayers } from "@/data/players";
import { useGameStore } from "@/store/game-store";

export default function EraPage() {
  return (
    <Suspense
      fallback={
        <main className="game-page loading-state">
          <div className="loading-emblem" />
          <p className="eyebrow">OPENING THE GRAND ARCHIVE</p>
        </main>
      }
    >
      <EraPageContent />
    </Suspense>
  );
}

function EraPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const selectEra = useGameStore((state) => state.selectEra);
  const allStarsMode = searchParams.get("mode") === "all-stars";

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
            <h1 id="era-title">
              {allStarsMode
                ? "Choose the All-Stars match environment."
                : "Choose the match environment."}
            </h1>
            <p>
              {allStarsMode
                ? "The curated Mythic XI and ordered three-player bench are ready. Your choice applies bidirectional Era Translation before opponent selection."
                : "Every valid tournament card remains available in every era. Missing photographs use a clean Photo Pending identity marker without changing draft eligibility."}
            </p>
          </div>
          <div className="era-grid era-grid--flow">
            {draftEras.map((era) => {
              return (
                <button
                  key={era.id}
                  className={`era-card ${era.themeClass}`}
                  onClick={() => {
                    const mode =
                      searchParams.get("mode") === "all-stars"
                        ? "all-stars"
                        : "draft";
                    selectEra(era.id, mode);
                    router.push(
                      mode === "all-stars" ? "/play/draft" : "/play/manager",
                    );
                  }}
                  aria-label={`Choose ${era.label}, ${era.years}`}
                >
                  <span>{era.accent}</span>
                  <b>{era.years}</b>
                  <h2>{era.label}</h2>
                  <p>{era.description}</p>
                  <footer>
                    <small>
                      {allStarsMode
                        ? "Curated Mythic squad ready"
                        : `${draftEligiblePlayers.length} draftable cards available`}
                    </small>
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
