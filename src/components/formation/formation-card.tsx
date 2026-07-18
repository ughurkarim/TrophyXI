"use client";

import { Check } from "lucide-react";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import type { Formation } from "@/types/game";
import { cn } from "@/lib/utils";

export function FormationCard({
  formation,
  selected,
  onSelect,
  managerFit,
  eraCompatible,
}: {
  formation: Formation;
  selected: boolean;
  onSelect: () => void;
  managerFit?: number;
  eraCompatible?: boolean;
}) {
  return (
    <button
      className={cn("formation-card", selected && "formation-card--selected")}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="formation-card__top">
        <span className="eyebrow">TACTICAL SHAPE</span>
        {selected && (
          <span className="selected-badge">
            <Check size={13} aria-hidden /> Selected
          </span>
        )}
      </div>
      <TacticalPitch formation={formation} compact />
      <div className="formation-card__copy">
        <h3>{formation.name}</h3>
        <p>{formation.description}</p>
      </div>
      <div className="tendency-row" aria-label={`${formation.name} tendencies`}>
        {Object.entries(formation.tendencies).map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <b>{value}</b>
          </span>
        ))}
      </div>
      {managerFit !== undefined && (
        <div className="formation-card__fit">
          <span>Manager fit <b>{managerFit}</b></span>
          <span>Era profile <b>{eraCompatible ? "Strong" : "Adaptable"}</b></span>
        </div>
      )}
    </button>
  );
}
