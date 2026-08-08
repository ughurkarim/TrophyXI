"use client";

import { ArrowRight, Eye, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ManagerCard } from "@/components/cards/manager-card";
import { ManagerDetails } from "@/components/cards/manager-details";
import { FreeManagerPicker } from "@/components/manager/free-manager-picker";
import { MobileRespinDialog } from "@/components/mobile/mobile-respin-dialog";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { managersById } from "@/data/managers";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
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
        ) : (<>
          <section
            className={`manager-selection ${styles.managerScreen} ${styles.desktopManagerScreen}`}
            aria-labelledby="manager-title"
          >
            <div className={styles.intro}>
              <p className="eyebrow eyebrow--gold">
                TOURNAMENT MANAGERS / STEP 02
              </p>
              <h1 id="manager-title">Choose your manager.</h1>
              <p>
                Tactics. Leadership. Match decisions. Choose who leads your XI.
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
                <span className="eyebrow">MATCH ERA</span>
                <p>{era.label}</p>
                <small>Manager tactics adapt to this environment.</small>
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
                {selectedManager ? "SELECT MANAGER" : "SELECT A MANAGER"}
                <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </section>

          <section className={styles.mobileManagerScreen} aria-labelledby="mobile-manager-title" data-testid="mobile-manager-picker">
            <header className={styles.mobileIntro}>
              <p>STEP 02 · TOURNAMENT MANAGERS</p>
              <h1 id="mobile-manager-title">Choose your manager.</h1>
              <span>Compare the three. Tap to select.</span>
            </header>

            <div
              className={styles.mobileManagerList}
              aria-label="Manager shortlist"
              data-testid="mobile-manager-list"
            >
              {options.map((manager) => {
                const isSelected = manager.id === managerId;
                const eraFit = calculateManagerEraFit(manager, eraId);
                return (
                  <article
                    className={styles.mobileManager}
                    data-selected={isSelected ? "true" : undefined}
                    data-testid="mobile-manager-card"
                    key={`mobile-${manager.id}`}
                  >
                    <button
                      type="button"
                      className={styles.mobileManagerSelect}
                      aria-label={`Choose ${manager.managerName}, ${manager.countryName} ${manager.tournamentYear}, preferred formations ${manager.preferredFormations.join(" and ")}, Era Fit ${eraFit.applicable ? eraFit.score : "not applicable"}`}
                      aria-pressed={isSelected}
                      onClick={() => selectManager(manager.id)}
                    >
                      <span className={styles.mobileManagerLead}>
                        <span className={styles.mobileManagerMeta}>
                          {flagForCountry(manager.countryCode)} {manager.tournamentYear}
                        </span>
                        <CircularPortrait
                          imageId={manager.imageId}
                          subjectName={manager.managerName}
                          era={manager.era}
                          countryCode={manager.countryCode}
                          tournamentYear={manager.tournamentYear}
                          size="hero"
                        />
                      </span>
                      <span
                        className={styles.mobileManagerCopy}
                        data-testid="mobile-manager-copy"
                      >
                        <strong>{manager.managerName}</strong>
                        <span className={styles.mobileManagerStyle}>{manager.style} football</span>
                        <blockquote data-testid="mobile-manager-description">
                          {manager.tacticalIdentity}
                        </blockquote>
                        <span
                          className={styles.mobileManagerFormations}
                          data-testid="mobile-manager-formations"
                        >
                          <small>PREF</small> · {manager.preferredFormations.join(" / ")}
                        </span>
                      </span>
                      <span className={styles.mobileManagerGrades} data-testid="mobile-manager-grades">
                        <span
                          className={styles.mobileManagerEraFit}
                          data-testid="mobile-manager-era-fit"
                        >
                          <small>ERA FIT</small>
                          <b>{eraFit.applicable ? eraFit.score : "—"}</b>
                        </span>
                        <span data-testid="mobile-manager-grade"><small>OFF</small><b>{manager.grades.offense}</b></span>
                        <span data-testid="mobile-manager-grade"><small>DEF</small><b>{manager.grades.defense}</b></span>
                        <span data-testid="mobile-manager-grade"><small>LEAD</small><b>{manager.leadership}</b></span>
                        <span data-testid="mobile-manager-grade"><small>GAME</small><b>{manager.gameManagement}</b></span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.mobileProfile}
                      data-testid="mobile-manager-profile"
                      onClick={(event) => {
                        setDetailReturnFocus(event.currentTarget);
                        setInspectedManagerId(manager.id);
                      }}
                    >
                      <Eye size={14} aria-hidden /> Profile
                    </button>
                  </article>
                );
              })}
            </div>

            <footer className={styles.mobileManagerAction} data-testid="mobile-manager-action">
              <button
                type="button"
                onClick={() => setShowRespin(true)}
                disabled={managerRespinRemaining === 0}
                aria-label={managerRespinLabel}
              >
                <RefreshCw size={16} aria-hidden />
                <span>{managerRespinRemaining ? "Respin" : "Used"}</span>
              </button>
              <span>
                <small>{era.label} · {selectedManager ? "SELECTED" : "NO MANAGER"}</small>
                <strong>{selectedManager?.managerName ?? "Choose a manager"}</strong>
              </span>
              <Button disabled={!selectedManager} onClick={() => router.push("/play/formation")}>
                Continue <ArrowRight size={16} aria-hidden />
              </Button>
            </footer>
          </section>
        </>)}
      </main>
      {showRespin && (
        <>
          <div className={`dialog-backdrop ${styles.desktopRespinDialog}`} role="presentation">
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
          <MobileRespinDialog
            kind="manager"
            onCancel={() => setShowRespin(false)}
            onConfirm={() => {
              respinManagers();
              setShowRespin(false);
            }}
          />
        </>
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
