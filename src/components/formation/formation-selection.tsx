"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
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
        <p className="eyebrow eyebrow--gold">TACTICAL ROOM / STEP 03</p>
        <h1 id="formation-heading">Choose your system.</h1>
        <p>
          Select the formation that best fits your manager, the match era, and
          the squad you want to build.
        </p>
      </div>
      <div
        className={cn("formation-context", styles.context)}
        data-testid="formation-context"
      >
        <div className={styles.contextField}>
          <span>Manager</span>
          <strong>{manager.managerName}</strong>
        </div>
        <div className={styles.contextField}>
          <span>Style</span>
          <strong>{manager.style}</strong>
        </div>
        <div className={styles.contextField}>
          <span>Match Era</span>
          <strong>{era.label}</strong>
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
              ? "FORMATION RESPIN ×1"
              : "FORMATION RESPIN USED"}
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
          <span>Selected System</span>
          <strong>
            {selectedMetrics?.formation.name ?? "Choose a formation"}
          </strong>
        </div>
        <div className={styles.selectedFit}>
          <span>Manager Fit</span>
          <strong>{selectedMetrics?.managerFit ?? "—"}</strong>
        </div>
        <div className={styles.selectedFit}>
          <span>Era Fit</span>
          <strong>
            {eraId === "all"
              ? "Neutral"
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
          ENTER DRAFT →
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
            <span className="eyebrow eyebrow--gold">FORMATION RESPIN ×1</span>
            <h2 id="formation-respin-title">
              Replace all four formation choices?
            </h2>
            <p>
              The new deterministic offer keeps manager and era compatibility.
              This does not consume either player respin.
            </p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowRespin(false)}
                autoFocus
              >
                Keep Formations
              </Button>
              <Button
                onClick={() => {
                  setSelected(null);
                  onRespin();
                  setShowRespin(false);
                }}
              >
                Use Formation Respin
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}