"use client";

import {
  ArrowRight,
  CircleDot,
  Scale,
  Shield,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
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

function TacticalIcon({ style, size = 14 }: { style: string; size?: number }) {
  const normalized = style.toLocaleLowerCase();

  if (normalized === "pressing") return <Zap size={size} aria-hidden />;
  if (normalized === "counter") return <ArrowRight size={size} aria-hidden />;
  if (normalized === "defensive") return <Shield size={size} aria-hidden />;
  if (normalized === "direct") return <Target size={size} aria-hidden />;
  if (normalized === "fluid") return <Waves size={size} aria-hidden />;
  if (normalized === "possession") return <CircleDot size={size} aria-hidden />;
  return <Scale size={size} aria-hidden />;
}

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
      preferred: manager.preferredFormations.includes(formation.id),
    }))
    .sort(
      (first, second) =>
        Number(second.preferred) - Number(first.preferred) ||
        second.managerFit - first.managerFit ||
        (eraId === "all" ? 0 : second.eraFit - first.eraFit) ||
        first.formation.name.localeCompare(second.formation.name),
    );

  const selected = options.find(({ formation }) => formation.id === selectedId);

  return (
    <section
      className={styles.picker}
      aria-labelledby="free-formation-title"
      data-testid="free-formation-picker"
    >
      <div className={styles.intro}>
        <div>
          <p className="eyebrow eyebrow--gold">FREE SELECTION / FORMATION</p>
          <h1 id="free-formation-title">Pick your system.</h1>
        </div>
        <p>
          Every active formation is open. Compare its shape and fit, then
          confirm one system.
        </p>
      </div>

      <div
        className={styles.context}
        data-testid="free-formation-context"
      >
        <span className={`${styles.contextItem} ${styles.managerContext}`}>
          <span className={styles.managerPortrait}>
            <CircularPortrait
              imageId={manager.imageId}
              subjectName={manager.managerName}
              era={manager.era}
              countryCode={manager.countryCode}
              tournamentYear={manager.tournamentYear}
              size="compact"
            />
          </span>
          <span className={styles.managerCopy}>
            <small>Selected manager</small>
            <strong>{manager.managerName}</strong>
            <em>{manager.countryName} · {manager.tournamentYear}</em>
          </span>
        </span>

        <span className={styles.contextItem}>
          <small>Tactical identity</small>
          <strong className={styles.styleValue}>
            <span>{manager.style}</span>
            <i aria-hidden>
              <TacticalIcon style={manager.style} size={14} />
            </i>
          </strong>
        </span>

        <span className={styles.contextItem}>
          <small>Preferred systems</small>
          <strong>{manager.preferredFormations.join(" · ")}</strong>
          {eraId !== "all" && <em>{era.label}</em>}
        </span>

        <span className={styles.available}>
          <small>Archive</small>
          <strong>{options.length}</strong>
          <em>formations available</em>
        </span>
      </div>

      <div
        className={styles.grid}
        aria-label="Available formations"
        data-testid="free-formation-archive"
      >
        {options.map(({ formation, managerFit, eraFit, preferred }, index) => {
          const selectedOption = formation.id === selectedId;

          return (
            <button
              type="button"
              key={formation.id}
              className={`${styles.option}${selectedOption ? ` ${styles.selected}` : ""}${preferred ? ` ${styles.preferredOption}` : ""}`}
              aria-pressed={selectedOption}
              aria-label={`Choose ${formation.name} formation, Manager Fit ${managerFit}${eraId === "all" ? "" : `, Era Fit ${eraFit}`}`}
              data-formation-id={formation.id}
              data-manager-fit={managerFit}
              data-era-fit={eraId === "all" ? undefined : eraFit}
              data-recommended={index === 0 ? "true" : undefined}
              data-preferred={preferred ? "true" : undefined}
              data-style={formation.managerStyles[0].toLowerCase()}
              onClick={() => setSelectedId(formation.id)}
            >
              {preferred && <span className={styles.preferred}>PREFERRED</span>}

              <span className={styles.pitchFrame} aria-hidden>
                <span className={styles.pitchGlow} />
                <span className={styles.pitch}>
                  <TacticalPitch formation={formation} compact />
                </span>
              </span>

              <span className={styles.copy}>
                <span className={styles.title}>
                  <strong>{formation.name}</strong>
                </span>

                <span className={styles.identity}>
                  {formation.managerStyles[0]} · {formation.tacticalDifficulty}
                </span>

                <span className={styles.ratingRow}>
                  <span className={styles.ratingLabel}>Manager fit</span>
                  <b>{managerFit}</b>
                </span>

                <span className={styles.tendencyLabels}>ATT · MID · DEF</span>
                <span className={styles.tendencies}>
                  {formation.tendencies.attack} · {formation.tendencies.control} · {formation.tendencies.defense}
                </span>

                {eraId !== "all" && (
                  <span className={styles.eraFit}>
                    ERA FIT <b>{eraFit}</b>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`${styles.confirm}${selected ? ` ${styles.confirmReady}` : ""}`} aria-live="polite">
        <div>
          <span>Selected system</span>
          <strong>{selected?.formation.name ?? "Choose a formation"}</strong>
          <small>
            {selected
              ? eraId === "all"
                ? `${manager.managerName} · Manager Fit ${selected.managerFit}`
                : `${manager.managerName} · Manager Fit ${selected.managerFit} · Era Fit ${selected.eraFit}`
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