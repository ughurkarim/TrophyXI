import { ArrowRight, Check, ShieldCheck } from "lucide-react";
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
  const eraFit =
    eraId === "all" ? null : calculateManagerEraFit(manager, eraId).score;

  const metricValues = [
    {
      label: "OFF",
      value: manager.grades.offense,
      grade: managerGradeLabel(manager.grades.offense),
      eraFit: false,
    },
    {
      label: "DEF",
      value: manager.grades.defense,
      grade: managerGradeLabel(manager.grades.defense),
      eraFit: false,
    },
    {
      label: "LEAD",
      value: manager.leadership,
      grade: managerGradeLabel(manager.leadership),
      eraFit: false,
    },
    {
      label: "GAME",
      value: manager.gameManagement,
      grade: managerGradeLabel(manager.gameManagement),
      eraFit: false,
    },
    ...(eraFit === null
      ? []
      : [
          {
            label: "ERA FIT",
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
        aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`}
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
            {manager.style.toUpperCase()} TACTICS
          </span>
          <h2>{manager.managerName}</h2>
          <p>
            {flagForTeamName(manager.teamName)} {manager.teamName}
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
        {manager.tacticalIdentity}
      </blockquote>

      <div
        className={cn(
          styles.metrics,
          eraFit !== null && styles.metricsWithEraFit,
        )}
        aria-label={`${manager.managerName} metrics: offense ${managerGradeLabel(manager.grades.offense)}, defense ${managerGradeLabel(manager.grades.defense)}, leadership ${managerGradeLabel(manager.leadership)}, game management ${managerGradeLabel(manager.gameManagement)}${eraFit === null ? "" : `, Era Fit ${eraFit}`}`}
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
            SELECTED
          </strong>
        ) : (
          <span className={styles.selectLabel}>
            SELECT MANAGER
            <ArrowRight size={13} aria-hidden />
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
            aria-label={`View manager record for ${manager.managerName}`}
          >
            VIEW PROFILE
            <ArrowRight size={13} aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}