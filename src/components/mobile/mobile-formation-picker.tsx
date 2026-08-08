"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { MobileRespinDialog } from "@/components/mobile/mobile-respin-dialog";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { formations } from "@/data/formations";
import { calculateManagerFit } from "@/engine/chemistry";
import { calculateFormationEraFit } from "@/engine/formation-fit";
import type { DraftEraId, FormationId, ManagerTournamentCard } from "@/types/game";
import styles from "./mobile-formation-picker.module.css";

export function MobileFormationPicker({
  manager,
  eraId,
  offerIds,
  formationRespinRemaining,
  onRespin,
  onContinue,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  offerIds: FormationId[];
  formationRespinRemaining: number;
  onRespin: () => void;
  onContinue: (formationId: FormationId) => void;
}) {
  const [selectedId, setSelectedId] = useState<FormationId | null>(null);
  const [showRespin, setShowRespin] = useState(false);
  const era = getDraftEra(eraId);
  const options = offerIds.flatMap((id) => {
    const formation = formations.find((candidate) => candidate.id === id);
    return formation ? [{
      formation,
      managerFit: calculateManagerFit(manager, formation, eraId),
      eraFit: calculateFormationEraFit(formation, eraId),
    }] : [];
  });
  const selected = options.find(({ formation }) => formation.id === selectedId);

  return (
    <section className={styles.root} aria-labelledby="mobile-formation-title" data-testid="mobile-formation-picker">
      <header className={styles.intro}>
        <p>STEP 03 · TACTICAL ROOM</p>
        <h1 id="mobile-formation-title">Choose your system.</h1>
        <span className={styles.context}>
          <strong>{manager.managerName} · {era.label}</strong>
          <span>Choose from four offered shapes.</span>
        </span>
      </header>

      <div className={styles.list} aria-label="Formation shortlist" data-testid="mobile-formation-list">
        {options.map(({ formation, managerFit, eraFit }) => {
          const isSelected = formation.id === selectedId;
          return (
            <button
              type="button"
              key={formation.id}
              className={styles.card}
              data-testid="mobile-formation-card"
              data-selected={isSelected ? "true" : undefined}
              aria-pressed={isSelected}
              aria-label={`Choose ${formation.name} formation, manager fit ${managerFit}${eraId === "all" ? "" : `, era fit ${eraFit}`}`}
              onClick={() => setSelectedId(formation.id)}
            >
              <span className={styles.identityBlock}>
                <small>SYSTEM</small>
                <strong>{formation.name}</strong>
                <span className={styles.identity}>{formation.managerStyles[0]} · {formation.tacticalDifficulty}</span>
              </span>
              <span className={styles.pitch} aria-hidden data-testid="mobile-formation-pitch">
                <TacticalPitch formation={formation} compact />
              </span>
              <span className={styles.metrics} data-testid="mobile-formation-metrics">
                <span><small>Manager fit</small><b>{managerFit}</b></span>
                <span><small>Era fit</small><b>{eraId === "all" ? "—" : eraFit}</b></span>
                <span><small>Balance</small><b>{formation.tendencies.control}</b></span>
              </span>
            </button>
          );
        })}
      </div>

      <footer className={styles.action} data-testid="mobile-formation-action">
        <button
          type="button"
          onClick={() => setShowRespin(true)}
          disabled={formationRespinRemaining === 0}
          aria-label={formationRespinRemaining ? "Formation respin, one remaining" : "Formation respin used"}
        >
          <RefreshCw size={16} aria-hidden />
          <span>{formationRespinRemaining ? "Respin" : "Used"}</span>
        </button>
        <span>
          <small>{selected ? "SELECTED SYSTEM" : "TACTICAL SHAPE"}</small>
          <strong>{selected?.formation.name ?? "Choose a formation"}</strong>
        </span>
        <Button disabled={!selected} onClick={() => selected && onContinue(selected.formation.id)}>
          Draft <ArrowRight size={16} aria-hidden />
        </Button>
      </footer>

      {showRespin && (
        <MobileRespinDialog
          kind="formation"
          onCancel={() => setShowRespin(false)}
          onConfirm={() => {
            setSelectedId(null);
            onRespin();
            setShowRespin(false);
          }}
        />
      )}
    </section>
  );
}
