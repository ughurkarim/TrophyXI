"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { formations } from "@/data/formations";
import { calculateManagerFit } from "@/engine/chemistry";
import { calculateFormationEraFit } from "@/engine/formation-fit";
import type {
  DraftEraId,
  FormationId,
  ManagerTournamentCard,
} from "@/types/game";
import styles from "./free-formation-picker.module.css";

export function FreeFormationPicker({
  manager,
  eraId,
  formationIds,
  onContinue,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  formationIds: FormationId[];
  onContinue: (formationId: FormationId) => void;
}) {
  const [selectedId, setSelectedId] = useState<FormationId | null>(null);
  const era = getDraftEra(eraId);
  const options = formationIds
    .map((id) => formations.find((formation) => formation.id === id))
    .filter((formation): formation is (typeof formations)[number] =>
      Boolean(formation),
    )
    .map((formation) => ({
      formation,
      managerFit: calculateManagerFit(manager, formation, eraId),
      eraFit: calculateFormationEraFit(formation, eraId),
    }));
  const selected = options.find(
    ({ formation }) => formation.id === selectedId,
  );

  return (
    <section
      className={styles.picker}
      aria-labelledby="free-formation-title"
      data-testid="free-formation-picker"
    >
      <div className={styles.intro}>
        <div>
          <p className="eyebrow eyebrow--gold">
            FREE SELECTION / FORMATION
          </p>
          <h1 id="free-formation-title">Pick your system.</h1>
        </div>
        <p>
          Every active formation is open. Compare its shape and fit, then
          confirm one system.
        </p>
      </div>

      <div className={styles.context} data-testid="free-formation-context">
        <span>
          Manager
          <strong>{manager.managerName}</strong>
        </span>
        <span>
          Style
          <strong>{manager.style}</strong>
        </span>
        <span>
          Match Era
          <strong>{era.label}</strong>
        </span>
        <small>{options.length} formations available</small>
      </div>

      <div
        className={styles.grid}
        aria-label="Available formations"
        data-testid="free-formation-archive"
      >
        {options.map(({ formation, managerFit, eraFit }) => {
          const selectedOption = formation.id === selectedId;
          return (
            <button
              type="button"
              key={formation.id}
              className={`${styles.option}${
                selectedOption ? ` ${styles.selected}` : ""
              }`}
              aria-pressed={selectedOption}
              aria-label={`Choose ${formation.name} formation, Manager Fit ${managerFit}, Era Fit ${eraFit}`}
              data-formation-id={formation.id}
              data-manager-fit={managerFit}
              data-era-fit={eraFit}
              onClick={() => setSelectedId(formation.id)}
            >
              <span className={styles.pitch}>
                <TacticalPitch formation={formation} compact />
              </span>
              <span className={styles.copy}>
                <span className={styles.title}>
                  <strong>{formation.name}</strong>
                  {selectedOption && (
                    <i aria-hidden>
                      <Check size={12} />
                    </i>
                  )}
                </span>
                <small>{formation.tacticalDifficulty}</small>
                <span className={styles.fits}>
                  <span>
                    MGR <b>{managerFit}</b>
                  </span>
                  <span>
                    ERA <b>{eraFit}</b>
                  </span>
                </span>
                <span className={styles.tendencies}>
                  A {formation.tendencies.attack} · C{" "}
                  {formation.tendencies.control} · D{" "}
                  {formation.tendencies.defense}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.confirm} aria-live="polite">
        <div>
          <span>Selected System</span>
          <strong>{selected?.formation.name ?? "Choose a formation"}</strong>
          <small>
            {selected
              ? `Manager Fit ${selected.managerFit} · Era Fit ${selected.eraFit}`
              : "Nothing is preselected."}
          </small>
        </div>
        <Button
          className={styles.continue}
          disabled={!selected}
          onClick={() => {
            if (selected) onContinue(selected.formation.id);
          }}
        >
          CONTINUE TO SQUAD
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
