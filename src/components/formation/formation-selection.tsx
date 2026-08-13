"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { FormationCard } from "@/components/formation/formation-card";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { formations } from "@/data/formations";
import { calculateManagerFit } from "@/engine/chemistry";
import { calculateFormationEraFit } from "@/engine/formation-fit";
import { cn } from "@/lib/utils";
import type {
  DraftEraId,
  FormationId,
  ManagerTournamentCard,
} from "@/types/game";
import styles from "./formation-selection.module.css";
import { useLocalizedContent } from "@/i18n/content";

export function FormationSelection({
  manager,
  eraId,
  offerIds,
  formationRespinRemaining,
  showRespinControl = true,
  onRespin,
  onContinue,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  offerIds: FormationId[];
  formationRespinRemaining: number;
  showRespinControl?: boolean;
  onRespin: () => void;
  onContinue: (formationId: FormationId) => void;
}) {
  const t = useTranslations("gameSetup.formation");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();
  const offered = offerIds
    .map((id) => formations.find((formation) => formation.id === id))
    .filter((formation): formation is (typeof formations)[number] => Boolean(formation));
  const [selected, setSelected] = useState<FormationId | null>(null);
  const [showRespin, setShowRespin] = useState(false);
  const era = getDraftEra(eraId);
  const offerMetrics = offered.map((formation) => {
    const managerFit = calculateManagerFit(manager, formation, eraId);
    const eraFit = calculateFormationEraFit(formation, eraId);
    return {
      formation,
      managerFit,
      eraFit,
    };
  });
  const selectedMetrics =
    offerMetrics.find((item) => item.formation.id === selected) ?? null;

  return (
    <section
      className={cn("formation-selection", styles.selection)}
      aria-labelledby="formation-heading"
    >
      <div className={styles.intro}>
        <p className="eyebrow eyebrow--gold">{t("eyebrow")}</p>
        <h1 id="formation-heading">{t("title")}</h1>
        <p>{t("description")}</p>
      </div>
      <div
        className={cn("formation-context", styles.context)}
        data-testid="formation-context"
      >
        <div className={styles.contextField}>
          <span>{t("manager")}</span>
          <strong>{manager.managerName}</strong>
        </div>
        <div className={styles.contextField}>
          <span>{t("style")}</span>
          <strong>{localize(manager.style)}</strong>
        </div>
        <div className={styles.contextField}>
          <span>{t("matchEra")}</span>
          <strong>{eraT(`${era.id}.label`)}</strong>
        </div>
        {showRespinControl && (
          <button
            type="button"
            className={cn(
              "button button--secondary formation-respin",
              styles.respin,
            )}
            disabled={formationRespinRemaining === 0}
            onClick={() => setShowRespin(true)}
          >
            <RefreshCw size={15} aria-hidden />
            {formationRespinRemaining
              ? t("respin")
              : t("respinUsed")}
          </button>
        )}
      </div>
      <div className={cn("formation-grid", styles.formationGrid)}>
        {offerMetrics.map(({ formation, managerFit, eraFit }) => (
          <FormationCard
            key={formation.id}
            formation={formation}
            selected={selectedMetrics?.formation.id === formation.id}
            onSelect={() => setSelected(formation.id)}
            managerFit={managerFit}
            eraFit={eraFit}
            showEraFit={eraId !== "all"}
          />
        ))}
      </div>
      <div
        className={cn("formation-continue", styles.selectedSystem)}
        data-testid="selected-system"
      >
        <div className={styles.selectedName}>
          <span>{t("selectedSystem")}</span>
          <strong>
            {selectedMetrics?.formation.name ?? t("chooseFormation")}
          </strong>
        </div>
        <div className={styles.selectedFit}>
          <span>{t("managerFit")}</span>
          <strong>{selectedMetrics?.managerFit ?? "—"}</strong>
        </div>
        <div className={styles.selectedFit}>
          <span>{t("eraFit")}</span>
          <strong>
            {eraId === "all"
              ? t("neutral")
              : selectedMetrics?.eraFit ?? "—"}
          </strong>
        </div>
        <Button
          className={styles.enterButton}
          disabled={!selectedMetrics}
          onClick={() => {
            if (selectedMetrics) onContinue(selectedMetrics.formation.id);
          }}
        >
          {t("enterDraft")} →
        </Button>
      </div>
      {showRespinControl && showRespin && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="formation-respin-title"
          >
            <span className="eyebrow eyebrow--gold">{t("respin")}</span>
            <h2 id="formation-respin-title">
              {t("dialogTitle")}
            </h2>
            <p>{t("dialogDescription")}</p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowRespin(false)}
                autoFocus
              >
                {t("keepFormations")}
              </Button>
              <Button
                onClick={() => {
                  setSelected(null);
                  onRespin();
                  setShowRespin(false);
                }}
              >
                {t("useRespin")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
