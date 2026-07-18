"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ManagerCard } from "@/components/cards/manager-card";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { getDraftEra } from "@/data/eras";
import { managersById } from "@/data/managers";
import { useGameStore } from "@/store/game-store";

export default function ManagerPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const eraId = useGameStore((state) => state.eraId);
  const optionIds = useGameStore((state) => state.managerOptionIds);
  const selectManager = useGameStore((state) => state.selectManager);

  useEffect(() => {
    if (hydrated && !eraId) router.replace("/play/era");
  }, [eraId, hydrated, router]);

  if (!hydrated || !eraId) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">SUMMONING THE MANAGERS</p>
      </main>
    );
  }

  const era = getDraftEra(eraId);
  const options = optionIds.map((id) => managersById.get(id)).filter(Boolean);

  return (
    <div className={`game-page game-page--stadium ${era.themeClass}`}>
      <GameHeader step="MANAGER / 02" />
      <SaveNotice />
      <main className="container game-main">
        <section className="manager-selection" aria-labelledby="manager-title">
          <div className="game-intro">
            <p className="eyebrow eyebrow--gold">TOURNAMENT MANAGERS / STEP 02</p>
            <h1 id="manager-title">Choose the mind behind the XI.</h1>
            <p>
              Exactly three tournament versions. OFF, DEF, leadership, and game
              management shape formation compatibility and match decisions.
            </p>
          </div>
          <div className="manager-grid">
            {options.map((manager) =>
              manager ? (
                <ManagerCard
                  key={manager.id}
                  manager={manager}
                  onSelect={() => {
                    selectManager(manager.id);
                    router.push("/play/formation");
                  }}
                />
              ) : null,
            )}
          </div>
          <div className="manager-utility">
            <div>
              <span className="eyebrow">{era.label}</span>
              <p>
                Player respins are reserved for starter and bench card draws.
                Manager selection cannot consume them.
              </p>
            </div>
            <strong className="respin-counter">RESPINS ×2</strong>
          </div>
        </section>
      </main>
    </div>
  );
}
