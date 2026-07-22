import { Check, ShieldCheck } from "lucide-react";
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
  const eraFit = calculateManagerEraFit(manager, eraId).score;
  const metricValues = [
    {
      label: "OFF",
      value: manager.grades.offense,
      grade: managerGradeLabel(manager.grades.offense),
    },
    {
      label: "DEF",
      value: manager.grades.defense,
      grade: managerGradeLabel(manager.grades.defense),
    },
    {
      label: "LEAD",
      value: manager.leadership,
      grade: managerGradeLabel(manager.leadership),
    },
    {
      label: "GAME",
      value: manager.gameManagement,
      grade: managerGradeLabel(manager.gameManagement),
    },
    ...(eraId === "all"
      ? []
      : [
          {
            label: "ERA FIT",
            value: eraFit,
            grade: managerGradeLabel(eraFit),
          },
        ]),
  ];

  return (
    <article
      className={cn(
        "manager-card",
        styles.card,
        styleClasses[manager.style],
        eraId !== "all" && eraFit >= 92 && styles.highEraFit,
        selected && "manager-card--selected",
        selected && styles.selected,
      )}
    >
      <button
        type="button"
        className="manager-card__pick-target"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`}
      />
      <div className="manager-card__halo" aria-hidden />
      <div className={cn("manager-card__meta", styles.meta)}>
        <span>
          {flagForCountry(manager.countryCode)} {manager.countryCode}
        </span>
        <span>{manager.tournamentYear}</span>
      </div>
      <div className={cn("manager-card__portrait", styles.portrait)}>
        <CircularPortrait
          imageId={manager.imageId}
          subjectName={manager.managerName}
          era={manager.era}
          countryCode={manager.countryCode}
          tournamentYear={manager.tournamentYear}
          size="hero"
        />
        {selected && (
          <strong className={styles.selectedBadge}>
            <Check size={14} strokeWidth={2.4} aria-hidden />
            Selected
          </strong>
        )}
      </div>
      <div className={cn("manager-card__copy", styles.copy)}>
        <span className={styles.styleLabel}>
          {manager.style} tactics
        </span>
        <h2>{manager.managerName}</h2>
        <p>
          {flagForTeamName(manager.teamName)} {manager.teamName}
        </p>
        <div
          className={cn("manager-card__grades", styles.metrics)}
          aria-label={`${manager.managerName} metrics: offense ${managerGradeLabel(manager.grades.offense)}, defense ${managerGradeLabel(manager.grades.defense)}, leadership ${managerGradeLabel(manager.leadership)}, game management ${managerGradeLabel(manager.gameManagement)}${eraId === "all" ? "" : `, Era Fit ${managerGradeLabel(eraFit)} ${eraFit}`}`}
        >
          {metricValues.map((metric) => (
            <span key={metric.label}>
              <small>{metric.label}</small>
              <b>{metric.grade}</b>
              <i>{metric.value}</i>
            </span>
          ))}
        </div>
        <blockquote>{manager.tacticalIdentity}</blockquote>
        <small className={styles.formations}>
          <ShieldCheck size={13} aria-hidden />
          {manager.preferredFormations.join(" · ")}
        </small>
        {eraId === "all" && (
          <small className={styles.formations}>Neutral era — no era modifier.</small>
        )}
      </div>
      {onInspect && (
        <button
          type="button"
          className={cn("manager-card__inspect", styles.inspect)}
          onClick={(event) => {
            event.stopPropagation();
            onInspect();
          }}
          aria-label={`View manager record for ${manager.managerName}`}
        >
          View profile
        </button>
      )}
    </article>
  );
}
