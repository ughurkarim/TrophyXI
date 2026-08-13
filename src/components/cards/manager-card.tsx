"use client";

import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { managerGradeLabel } from "@/data/managers";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import type {
  DraftEraId,
  ManagerStyle,
  ManagerTournamentCard,
} from "@/types/game";
import { cn, flagForCountry, flagForTeamName } from "@/lib/utils";
import styles from "./manager-card.module.css";
import { useLocalizedContent } from "@/i18n/content";

const styleClasses: Record<ManagerStyle, string> = {
  possession: styles.attacking,
  pressing: styles.attacking,
  fluid: styles.attacking,
  counter: styles.transition,
  direct: styles.transition,
  defensive: styles.defensive,
  balanced: styles.balanced,
};

export function ManagerCard({
  manager,
  eraId,
  selected,
  onSelect,
  onInspect,
}: {
  manager: ManagerTournamentCard;
  eraId: DraftEraId;
  selected?: boolean;
  onSelect: () => void;
  onInspect?: () => void;
}) {
  const t = useTranslations("players.managerCard");
  const localize = useLocalizedContent();
  const eraFit =
    eraId === "all" ? null : calculateManagerEraFit(manager, eraId).score;

  const metricValues = [
    {
      label: t("off"),
      value: manager.grades.offense,
      grade: managerGradeLabel(manager.grades.offense),
      eraFit: false,
    },
    {
      label: t("def"),
      value: manager.grades.defense,
      grade: managerGradeLabel(manager.grades.defense),
      eraFit: false,
    },
    {
      label: t("lead"),
      value: manager.leadership,
      grade: managerGradeLabel(manager.leadership),
      eraFit: false,
    },
    {
      label: t("game"),
      value: manager.gameManagement,
      grade: managerGradeLabel(manager.gameManagement),
      eraFit: false,
    },
    ...(eraFit === null
      ? []
      : [
          {
            label: t("eraFit"),
            value: eraFit,
            grade: String(eraFit),
            eraFit: true,
          },
        ]),
  ];

  return (
    <article
      className={cn(
        styles.card,
        styleClasses[manager.style],
        eraFit !== null && eraFit >= 92 && styles.highEraFit,
        selected && styles.selected,
      )}
    >
      <button
        type="button"
        className={styles.pickTarget}
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={t("chooseAria", { manager: manager.managerName, team: localize(manager.teamName), year: manager.tournamentYear })}
      />

      <div className={styles.tacticalField} aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={styles.meta}>
        <span>
          {flagForCountry(manager.countryCode)} {manager.countryCode}
        </span>
        <span>{manager.tournamentYear}</span>
      </div>

      <div className={styles.heroRow}>
        <div className={styles.identity}>
          <span className={styles.styleLabel}>
            {t("styleTactics", { style: localize(manager.style).toUpperCase() })}
          </span>
          <h2>{manager.managerName}</h2>
          <p>
            {flagForTeamName(manager.teamName)} {localize(manager.teamName)}
          </p>
        </div>

        <div className={styles.portrait}>
          <span className={styles.portraitGlow} aria-hidden />
          <CircularPortrait
            imageId={manager.imageId}
            subjectName={manager.managerName}
            era={manager.era}
            countryCode={manager.countryCode}
            tournamentYear={manager.tournamentYear}
            size="hero"
          />
        </div>
      </div>

      <blockquote className={styles.identityLine}>
        {localize(manager.tacticalIdentity)}
      </blockquote>

      <div
        className={cn(
          styles.metrics,
          eraFit !== null && styles.metricsWithEraFit,
        )}
        aria-label={t("metricsAria", { manager: manager.managerName, offense: managerGradeLabel(manager.grades.offense), defense: managerGradeLabel(manager.grades.defense), leadership: managerGradeLabel(manager.leadership), management: managerGradeLabel(manager.gameManagement), eraFit: eraFit ?? t("notApplicable") })}
      >
        {metricValues.map((metric) => (
          <span
            key={metric.label}
            className={metric.eraFit ? styles.eraMetric : undefined}
          >
            <small>{metric.label}</small>
            <strong>{metric.grade}</strong>
            {!metric.eraFit && <i>{metric.value}</i>}
          </span>
        ))}
      </div>

      <div className={styles.lowerRow}>
        <small className={styles.formations}>
          <ShieldCheck size={13} aria-hidden />
          {manager.preferredFormations.join(" · ")}
        </small>
      </div>

      <div className={styles.footer}>
        {selected ? (
          <strong className={styles.selectedBadge}>
            <Check size={13} strokeWidth={2.4} aria-hidden />
            {t("selected")}
          </strong>
        ) : (
          <span className={styles.selectLabel}>
            {t("selectManager")}
          </span>
        )}

        {onInspect && (
          <button
            type="button"
            className={styles.inspect}
            onClick={(event) => {
              event.stopPropagation();
              onInspect();
            }}
            aria-label={t("viewAria", { manager: manager.managerName })}
          >
            {t("viewProfile")}
            <ArrowRight size={13} aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}
