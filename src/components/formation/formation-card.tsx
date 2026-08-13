"use client";

import { Check } from "lucide-react";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import type { Formation } from "@/types/game";
import { cn } from "@/lib/utils";
import styles from "./formation-card.module.css";
import { useTranslations } from "next-intl";
import { useLocalizedContent } from "@/i18n/content";

export function FormationCard({
  formation,
  selected,
  onSelect,
  managerFit,
  eraFit,
  showEraFit = true,
}: {
  formation: Formation;
  selected: boolean;
  onSelect: () => void;
  managerFit: number;
  eraFit: number;
  showEraFit?: boolean;
}) {
  const t = useTranslations("gameSetup.formation");
  const localize = useLocalizedContent();
  return (
    <button
      className={cn(
        "formation-card",
        styles.card,
        selected && "formation-card--selected",
        selected && styles.selected,
      )}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={t("chooseAria", { formation: formation.name, managerFit, eraFit: showEraFit ? eraFit : t("neutral") })}
      data-formation-id={formation.id}
      data-manager-fit={managerFit}
      data-era-fit={showEraFit ? eraFit : undefined}
    >
      <div className={cn("formation-card__top", styles.top)}>
        <span className={styles.identity}>
          {t("tacticalIdentity")} · {localize(formation.managerStyles[0])}
        </span>
        <span className={styles.badges}>
          {selected && (
            <span className={cn("selected-badge", styles.selectedBadge)}>
              <Check size={11} aria-hidden /> {t("selected")}
            </span>
          )}
        </span>
      </div>
      <TacticalPitch formation={formation} compact />
      <div className={cn("formation-card__copy", styles.copy)}>
        <h3>{formation.name}</h3>
        <p>{localize(formation.description)}</p>
      </div>
      <div
        className={cn("tendency-row", styles.tendencies)}
        aria-label={t("tendenciesAria", { formation: formation.name })}
      >
        {Object.entries(formation.tendencies).map(([label, value]) => (
          <span key={label}>
            <small>{t(`tendencies.${label === "control" ? "midfield" : label}`)}</small>
            <b>{value}</b>
          </span>
        ))}
      </div>
      <div className={styles.fitGrid}>
        <div className={styles.fitBlock} data-fit-kind="manager">
          <span>{t("managerFit")}</span>
          <strong>{managerFit}</strong>
        </div>
        <div className={styles.fitBlock} data-fit-kind="era">
          <span>{t("eraFit")}</span>
          <strong>{showEraFit ? eraFit : t("neutral")}</strong>
        </div>
      </div>
    </button>
  );
}
