"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ManagerCard } from "@/components/cards/manager-card";
import { ManagerDetails } from "@/components/cards/manager-details";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { managersById } from "@/data/managers";
import { useGameStore } from "@/store/game-store";

export default function ManagerPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const eraId = useGameStore((state) => state.eraId);
  const optionIds = useGameStore((state) => state.managerOptionIds);
  const selectManager = useGameStore((state) => state.selectManager);
  const managerRespinRemaining = useGameStore(
    (state) => state.managerRespinRemaining,
  );
  const respinManagers = useGameStore((state) => state.respinManagers);
  const [showRespin, setShowRespin] = useState(false);
  const [inspectedManagerId, setInspectedManagerId] = useState<string | null>(
    null,
  );
  const [detailReturnFocus, setDetailReturnFocus] =
    useState<HTMLElement | null>(null);

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
                  onInspect={() => {
                    const active = document.activeElement;
                    setDetailReturnFocus(
                      active instanceof HTMLElement ? active : null,
                    );
                    setInspectedManagerId(manager.id);
                  }}
                />
              ) : null,
            )}
          </div>
          <div className="manager-utility">
            <div>
              <span className="eyebrow">{era.label}</span>
              <p>
                Manager, formation, and player respins are three independent,
                persistent resources.
              </p>
            </div>
            <div className="manager-respin-actions">
              <Button
                variant="secondary"
                onClick={() => setShowRespin(true)}
                disabled={managerRespinRemaining === 0}
                aria-label={
                  managerRespinRemaining
                    ? "MANAGER RESPIN ×1"
                    : "MANAGER RESPIN USED"
                }
              >
                <RefreshCw size={15} aria-hidden />
                {managerRespinRemaining
                  ? "MANAGER RESPIN ×1"
                  : "MANAGER RESPIN USED"}
              </Button>
              <strong className="respin-counter">PLAYER RESPINS ×2</strong>
            </div>
          </div>
        </section>
      </main>
      {showRespin && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-respin-title"
          >
            <span className="eyebrow eyebrow--gold">MANAGER RESPIN ×1</span>
            <h2 id="manager-respin-title">
              Replace all three manager choices?
            </h2>
            <p>
              The original manager identities will not return when valid
              alternatives exist. Formation and player respins remain untouched.
            </p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowRespin(false)}
                autoFocus
              >
                Keep managers
              </Button>
              <Button
                onClick={() => {
                  respinManagers();
                  setShowRespin(false);
                }}
              >
                Use manager respin
              </Button>
            </div>
          </div>
        </div>
      )}
      {inspectedManagerId && managersById.get(inspectedManagerId) && (
        <ManagerDetails
          manager={managersById.get(inspectedManagerId)!}
          onClose={() => {
            setInspectedManagerId(null);
            window.requestAnimationFrame(() => detailReturnFocus?.focus());
          }}
        />
      )}
    </div>
  );
}
