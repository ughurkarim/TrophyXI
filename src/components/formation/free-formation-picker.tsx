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
import { useTranslations } from "next-intl";
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
import { useLocalizedContent } from "@/i18n/content";

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
  const t = useTranslations("freeSelection.formationPicker");
  const formationT = useTranslations("gameSetup.formation");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();
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
          <p className="eyebrow eyebrow--gold">{t("eyebrow")}</p>
          <h1 id="free-formation-title">{t("title")}</h1>
        </div>
        <p>
          {t("description")}
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
            <small>{t("selectedManager")}</small>
            <strong>{manager.managerName}</strong>
            <em>{localize(manager.countryName)} · {manager.tournamentYear}</em>
          </span>
        </span>

        <span className={styles.contextItem}>
          <small>{t("tacticalIdentity")}</small>
          <strong className={styles.styleValue}>
            <span>{localize(manager.style)}</span>
            <i aria-hidden>
              <TacticalIcon style={manager.style} size={14} />
            </i>
          </strong>
        </span>

        <span className={styles.contextItem}>
          <small>{t("preferredSystems")}</small>
          <strong>{manager.preferredFormations.join(" · ")}</strong>
          {eraId !== "all" && <em>{eraT(`${era.id}.label`)}</em>}
        </span>

        <span className={styles.available}>
          <small>{t("archive")}</small>
          <strong>{options.length}</strong>
          <em>{t("formationsAvailable")}</em>
        </span>
      </div>

      <div
        className={styles.grid}
        aria-label={t("availableFormations")}
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
              aria-label={formationT("chooseAria", { formation: formation.name, managerFit, eraFit: eraId === "all" ? formationT("neutral") : eraFit })}
              data-formation-id={formation.id}
              data-manager-fit={managerFit}
              data-era-fit={eraId === "all" ? undefined : eraFit}
              data-recommended={index === 0 ? "true" : undefined}
              data-preferred={preferred ? "true" : undefined}
              data-style={formation.managerStyles[0].toLowerCase()}
              onClick={() => setSelectedId(formation.id)}
            >
              {preferred && <span className={styles.preferred}>{t("preferred")}</span>}

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
                  {localize(formation.managerStyles[0])} · {localize(formation.tacticalDifficulty)}
                </span>

                <span className={styles.ratingRow}>
                  <span className={styles.ratingLabel}>{formationT("managerFit")}</span>
                  <b>{managerFit}</b>
                </span>

                <span className={styles.tendencyLabels}>{t("tendencies")}</span>
                <span className={styles.tendencies}>
                  {formation.tendencies.attack} · {formation.tendencies.control} · {formation.tendencies.defense}
                </span>

                {eraId !== "all" && (
                  <span className={styles.eraFit}>
                    {formationT("eraFit")} <b>{eraFit}</b>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`${styles.confirm}${selected ? ` ${styles.confirmReady}` : ""}`} aria-live="polite">
        <div>
          <span>{formationT("selectedSystem")}</span>
          <strong>{selected?.formation.name ?? formationT("chooseFormation")}</strong>
          <small>
            {selected
              ? eraId === "all"
                ? t("managerFitSummary", { manager: manager.managerName, managerFit: selected.managerFit })
                : t("fitSummary", { manager: manager.managerName, managerFit: selected.managerFit, eraFit: selected.eraFit })
              : t("nothingSelected")}
          </small>
        </div>
        <Button
          className={styles.continue}
          disabled={!selected}
          onClick={() => {
            if (selected) onContinue(selected.formation.id);
          }}
        >
          {t("continueToSquad")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
