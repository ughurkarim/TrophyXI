"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ManagerCard } from "@/components/cards/manager-card";
import { ManagerDetails } from "@/components/cards/manager-details";
import { FreeManagerPicker } from "@/components/manager/free-manager-picker";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { managersById } from "@/data/managers";
import { useGameStore } from "@/store/game-store";
import styles from "./manager-page.module.css";

export default function ManagerPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const eraId = useGameStore((state) => state.eraId);
  const gameMode = useGameStore((state) => state.gameMode);
  const optionIds = useGameStore((state) => state.managerOptionIds);
  const managerId = useGameStore((state) => state.managerId);
  const selectManager = useGameStore((state) => state.selectManager);
  const managerRespinRemaining = useGameStore(
    (state) => state.managerRespinRemaining,
  );
  const formationRespinRemaining = useGameStore(
    (state) => state.formationRespinRemaining,
  );
  const playerRespinsRemaining = useGameStore(
    (state) => state.playerRespinsRemaining,
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
  const options = optionIds.flatMap((id) => {
    const manager = managersById.get(id);
    return manager ? [manager] : [];
  });
  const selectedManager = managerId ? managersById.get(managerId) : undefined;
  const managerRespinLabel = managerId
    ? managerRespinRemaining
      ? "RESPIN VISIBLE MANAGERS ×1"
      : "MANAGER RESPIN USED"
    : managerRespinRemaining
      ? "MANAGER RESPIN ×1"
      : "MANAGER RESPIN USED";

  return (
    <div className={`game-page game-page--stadium ${era.themeClass}`}>
      <GameHeader step="MANAGER / 02" />
      <SaveNotice />
      <main className={`container game-main ${styles.main}`}>
        {gameMode === "free-selection" ? (
          <FreeManagerPicker
            managers={options}
            eraId={eraId}
            selectedManagerId={managerId}
            managerLocked={false}
            onSelect={selectManager}
            onInspect={(id, returnFocus) => {
              setDetailReturnFocus(returnFocus);
              setInspectedManagerId(id);
            }}
            onContinue={() => {
              router.push("/play/formation");
            }}
          />
        ) : (
          <section
            className={`manager-selection ${styles.managerScreen}`}
            aria-labelledby="manager-title"
          >
            <div className={styles.intro}>
              <p className="eyebrow eyebrow--gold">
                TOURNAMENT MANAGERS / STEP 02
              </p>
              <h1 id="manager-title">Choose your manager.</h1>
              <p>
                Choose the manager whose tactics, leadership, and match
                decisions best fit the team you want to build.
              </p>
            </div>
            <div className={`manager-grid ${styles.managerGrid}`}>
              {options.map((manager) =>
                manager ? (
                  <ManagerCard
                    key={manager.id}
                    manager={manager}
                    eraId={eraId}
                    selected={managerId === manager.id}
                    onSelect={() => selectManager(manager.id)}
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
            <div className={`manager-utility ${styles.utility}`}>
              <div className={styles.eraContext}>
                <span className="eyebrow">MATCH ERA · {era.label}</span>
                <p>
                  Manager tactics will adapt to the selected match environment.
                </p>
                <small>Each respin is saved and used separately.</small>
              </div>
              <div
                className={`manager-respin-actions ${styles.respinActions}`}
                aria-label="Saved respin counters"
              >
                <Button
                  variant="secondary"
                  onClick={() => setShowRespin(true)}
                  disabled={managerRespinRemaining === 0}
                  aria-label={managerRespinLabel}
                >
                  <RefreshCw size={15} aria-hidden />
                  {managerRespinLabel}
                </Button>
                <strong
                  className={styles.disabledCounter}
                  aria-disabled="true"
                >
                  {formationRespinRemaining
                    ? "FORMATION RESPIN ×1"
                    : "FORMATION RESPIN USED"}
                </strong>
                <strong className="respin-counter">
                  {playerRespinsRemaining
                    ? `PLAYER RESPINS ×${playerRespinsRemaining}`
                    : "PLAYER RESPINS USED"}
                </strong>
              </div>
              <Button
                className={styles.continueButton}
                disabled={!selectedManager}
                onClick={() => {
                  router.push("/play/formation");
                }}
              >
                {selectedManager
                  ? `CONTINUE WITH ${selectedManager.managerName.toLocaleUpperCase()}`
                  : "SELECT A MANAGER TO CONTINUE"}
                <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </section>
        )}
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
          eraId={eraId}
          onClose={() => {
            setInspectedManagerId(null);
            window.requestAnimationFrame(() => detailReturnFocus?.focus());
          }}
        />
      )}
    </div>
  );
}
