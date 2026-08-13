"use client";

import { ArrowRight, Eye, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { useLocalizedContent } from "@/i18n/content";

export default function ManagerPage() {
  const router = useRouter();
  const t = useTranslations("gameSetup.manager");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();
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
        <p className="eyebrow">{t("loading")}</p>
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
      ? t("respinVisible")
      : t("respinUsed")
    : managerRespinRemaining
      ? t("respin")
      : t("respinUsed");

  return (
    <div className={`game-page game-page--stadium ${era.themeClass}`}>
      <GameHeader step={t("step")} />
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
                {t("eyebrow")}
              </p>
              <h1 id="manager-title">{t("title")}</h1>
              <p>{t("description")}</p>
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
                <span className="eyebrow">{t("matchEra")}</span>
                <p>{eraT(`${era.id}.label`)}</p>
                <small>{t("eraContext")}</small>
              </div>
              <div
                className={`manager-respin-actions ${styles.respinActions}`}
                aria-label={t("savedRespins")}
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
                    ? t("formationRespin")
                    : t("formationRespinUsed")}
                </strong>
                <strong className="respin-counter">
                  {playerRespinsRemaining
                    ? t("playerRespins", { count: playerRespinsRemaining })
                    : t("playerRespinsUsed")}
                </strong>
              </div>
              <Button
                className={styles.continueButton}
                disabled={!selectedManager}
                onClick={() => {
                  router.push("/play/formation");
                }}
              >
                {selectedManager ? t("selectManager") : t("selectAManager")}
                <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </section>

          <section className={styles.mobileManagerScreen} aria-labelledby="mobile-manager-title" data-testid="mobile-manager-picker">
            <header className={styles.mobileIntro}>
              <p>{t("mobileEyebrow")}</p>
              <h1 id="mobile-manager-title">{t("title")}</h1>
              <span>{t("mobileHint")}</span>
            </header>

            <div
              className={styles.mobileManagerList}
              aria-label={t("shortlist")}
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
                      aria-label={t("chooseManagerAria", { name: manager.managerName, country: localize(manager.countryName), year: manager.tournamentYear, formations: manager.preferredFormations.join(" / "), fit: eraFit.applicable ? eraFit.score : t("notApplicable") })}
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
                        <span className={styles.mobileManagerStyle}>{t("styleFootball", { style: localize(manager.style) })}</span>
                        <blockquote data-testid="mobile-manager-description">
                          {localize(manager.tacticalIdentity)}
                        </blockquote>
                        <span
                          className={styles.mobileManagerFormations}
                          data-testid="mobile-manager-formations"
                        >
                          <small>{t("preferredShort")}</small> · {manager.preferredFormations.join(" / ")}
                        </span>
                      </span>
                      <span className={styles.mobileManagerGrades} data-testid="mobile-manager-grades">
                        <span
                          className={styles.mobileManagerEraFit}
                          data-testid="mobile-manager-era-fit"
                        >
                          <small>{t("eraFit")}</small>
                          <b>{eraFit.applicable ? eraFit.score : "—"}</b>
                        </span>
                        <span data-testid="mobile-manager-grade"><small>{t("offenseShort")}</small><b>{manager.grades.offense}</b></span>
                        <span data-testid="mobile-manager-grade"><small>{t("defenseShort")}</small><b>{manager.grades.defense}</b></span>
                        <span data-testid="mobile-manager-grade"><small>{t("leadershipShort")}</small><b>{manager.leadership}</b></span>
                        <span data-testid="mobile-manager-grade"><small>{t("gameManagementShort")}</small><b>{manager.gameManagement}</b></span>
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
                      <Eye size={14} aria-hidden /> {t("profile")}
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
                <span>{managerRespinRemaining ? t("respinShort") : t("used")}</span>
              </button>
              <span>
                <small>{eraT(`${era.id}.label`)} · {selectedManager ? t("selected") : t("noManager")}</small>
                <strong>{selectedManager?.managerName ?? t("chooseManager")}</strong>
              </span>
              <Button disabled={!selectedManager} onClick={() => router.push("/play/formation")}>
                {t("continue")} <ArrowRight size={16} aria-hidden />
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
              <span className="eyebrow eyebrow--gold">{t("respin")}</span>
              <h2 id="manager-respin-title">
                {t("dialogTitle")}
              </h2>
              <p>{t("dialogDescription")}</p>
              <div className="dialog__actions">
                <Button
                  variant="secondary"
                  onClick={() => setShowRespin(false)}
                  autoFocus
                >
                  {t("keepManagers")}
                </Button>
                <Button
                  onClick={() => {
                    respinManagers();
                    setShowRespin(false);
                  }}
                >
                  {t("useRespin")}
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
