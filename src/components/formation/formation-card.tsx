"use client";

import { Check } from "lucide-react";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import type { Formation } from "@/types/game";
import { cn } from "@/lib/utils";
import styles from "./formation-card.module.css";

export function FormationCard({
  formation,
  selected,
  recommended,
  onSelect,
  managerFit,
  eraFit,
}: {
  formation: Formation;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
  managerFit: number;
  eraFit: number;
}) {
  return (
    <button
      className={cn(
        "formation-card",
        styles.card,
        selected && "formation-card--selected",
        selected && styles.selected,
        recommended && styles.recommended,
      )}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Choose ${formation.name} formation, Manager Fit ${managerFit}, Era Fit ${eraFit}${
        recommended ? ", recommended" : ""
      }`}
      data-formation-id={formation.id}
      data-manager-fit={managerFit}
      data-era-fit={eraFit}
    >
      <div className={cn("formation-card__top", styles.top)}>
        <span className={styles.identity}>
          TACTICAL IDENTITY · {formation.managerStyles[0]}
        </span>
        <span className={styles.badges}>
          {recommended && (
            <span className={styles.recommendedBadge}>Recommended</span>
          )}
          {selected && (
            <span className={cn("selected-badge", styles.selectedBadge)}>
              <Check size={11} aria-hidden /> Selected
            </span>
          )}
        </span>
      </div>
      <TacticalPitch formation={formation} compact />
      <div className={cn("formation-card__copy", styles.copy)}>
        <h3>{formation.name}</h3>
        <p>{formation.description}</p>
      </div>
      <div
        className={cn("tendency-row", styles.tendencies)}
        aria-label={`${formation.name} tendencies`}
      >
        {Object.entries(formation.tendencies).map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <b>{value}</b>
          </span>
        ))}
      </div>
      <div className={styles.fitGrid}>
        <div className={styles.fitBlock} data-fit-kind="manager">
          <span>Manager Fit</span>
          <strong>{managerFit}</strong>
          <small>/100</small>
        </div>
        <div className={styles.fitBlock} data-fit-kind="era">
          <span>Era Fit</span>
          <strong>{eraFit}</strong>
          <small>/100</small>
        </div>
      </div>
    </button>
  );
}
