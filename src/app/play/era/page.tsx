"use client";

import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

export default function EraPage() {
  const router = useRouter();
  const t = useTranslations("gameSetup.era");
  const hydrated = useGameStore((state) => state.hasHydrated);
  const selectedEraId = useGameStore((state) => state.eraId);
  const selectEra = useGameStore((state) => state.selectEra);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">{t("loading")}</p>
      </main>
    );
  }

  const selectedEra = draftEras.find((era) => era.id === selectedEraId);

  return (
    <div className={`game-page game-page--stadium ${styles.page}`}>
      <GameHeader step={t("step")} />
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
              {t("eyebrow")}
            </p>
            <h1 id="era-title">{t("title")}</h1>
            <p>{t("description")}</p>
          </header>

          <div className={styles.grid} role="group" aria-label={t("chooseAria")}>
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
                  aria-label={t("chooseOptionAria", { era: t(`options.${era.id}.label`), years: era.years })}
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
                      {t(`options.${era.id}.identity`)}
                    </span>

                    <div className={styles.cardBody}>
                      <h2>{t(`options.${era.id}.label`)}</h2>
                      <p>{t(`options.${era.id}.description`)}</p>
                    </div>

                    <div className={styles.action} aria-hidden="true">
                      <span>
                        {isSelected ? (
                          <>
                            <Check size={13} strokeWidth={2.5} />
                            {t("selected")}
                          </>
                        ) : (
                          t("select")
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
              <span>{selectedEra ? t("selectedEra") : t("archive")}</span>
              <strong>{selectedEra ? t(`options.${selectedEra.id}.label`) : t("chooseGeneration")}</strong>
            </div>

            <div className={styles.commandContext}>
              <span>
                {selectedEra ? t(`options.${selectedEra.id}.identity`) : t("eraEffect")}
              </span>
              <strong>
                {selectedEra
                  ? t(`options.${selectedEra.id}.description`)
                  : t("effectDescription")}
              </strong>
            </div>

            <Button
              className={styles.selectButton}
              disabled={!selectedEraId}
              onClick={() => router.push("/play/manager")}
            >
              {t("selectEra")}
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
            <p>{t("mobileEyebrow")}</p>
            <h1 id="mobile-era-title">{t("title")}</h1>
            <span>{t("mobileDescription")}</span>
          </header>

          <div
            className={styles.mobileEraList}
            role="group"
            aria-label={t("chooseAria")}
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
                  aria-label={t("chooseOptionAria", { era: t(`options.${era.id}.label`), years: era.years })}
                  aria-pressed={isSelected}
                  onClick={() => selectEra(era.id)}
                >
                  <span className={styles.mobileEraYears}>{era.years}</span>
                  <span className={styles.mobileEraCopy}>
                    <small>{t(`options.${era.id}.identity`)}</small>
                    <strong>{t(`options.${era.id}.label`)}</strong>
                    <span>{t(`options.${era.id}.description`)}</span>
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
              <small>{selectedEra ? t("selectedEra") : t("matchEra")}</small>
              <strong>{selectedEra ? t(`options.${selectedEra.id}.label`) : t("chooseOne")}</strong>
            </span>
            <Button disabled={!selectedEraId} onClick={() => router.push("/play/manager")}>
              {t("continue")} <ArrowRight size={16} aria-hidden />
            </Button>
          </footer>
        </section>
      </main>
    </div>
  );
}
