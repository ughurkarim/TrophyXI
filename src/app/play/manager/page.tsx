"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ManagerCard } from "@/components/cards/manager-card";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { managersById } from "@/data/managers";
import { useGameStore } from "@/store/game-store";

export default function ManagerPage() {
  const router = useRouter();
  const [confirmRespin, setConfirmRespin] = useState(false);
  const hydrated = useGameStore((state) => state.hasHydrated);
  const eraId = useGameStore((state) => state.eraId);
  const optionIds = useGameStore((state) => state.managerOptionIds);
  const respinUsed = useGameStore((state) => state.respinUsed);
  const selectManager = useGameStore((state) => state.selectManager);
  const respinManagers = useGameStore((state) => state.respinManagers);

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
              Exactly three tournament versions. Your manager shapes formation
              compatibility, chemistry, and subtle match events.
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
              <p>One respin can be spent here or saved for any player round.</p>
            </div>
            <Button
              variant="secondary"
              disabled={respinUsed}
              onClick={() => setConfirmRespin(true)}
            >
              <RefreshCw size={16} aria-hidden />
              {respinUsed ? "Respin already used" : "Respin all three"}
            </Button>
          </div>
        </section>
      </main>

      {confirmRespin && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="manager-respin-title">
            <span className="eyebrow eyebrow--gold">ONE-TIME RESPIN</span>
            <h2 id="manager-respin-title">Dismiss all three managers?</h2>
            <p>
              Their identities cannot return, and you will have no player-round
              respin later.
            </p>
            <div className="dialog__actions">
              <Button variant="secondary" onClick={() => setConfirmRespin(false)} autoFocus>
                Keep options
              </Button>
              <Button onClick={() => { respinManagers(); setConfirmRespin(false); }}>
                Confirm manager respin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
