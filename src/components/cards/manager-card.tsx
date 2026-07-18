import { Check, Crown, ShieldCheck } from "lucide-react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { managerGradeLabel, managers } from "@/data/managers";
import type { ManagerTournamentCard } from "@/types/game";
import { cn, flagForCountry, flagForTeamName } from "@/lib/utils";

export function ManagerCard({
  manager,
  selected,
  onSelect,
  onInspect,
}: {
  manager: ManagerTournamentCard;
  selected?: boolean;
  onSelect: () => void;
  onInspect?: () => void;
}) {
  const versionYears = managers
    .filter(
      (candidate) =>
        candidate.managerIdentityId === manager.managerIdentityId,
    )
    .map((candidate) => candidate.tournamentYear)
    .sort((first, second) => second - first);
  return (
    <article
      className={cn("manager-card", selected && "manager-card--selected")}
    >
      <button
        type="button"
        className="manager-card__pick-target"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`}
      />
      <div className="manager-card__halo" aria-hidden />
      <div className="manager-card__meta">
        <span>{flagForCountry(manager.countryCode)} {manager.countryCode}</span>
        <span>{manager.tournamentYear}</span>
      </div>
      <div className="manager-card__portrait">
        <CircularPortrait
          imageId={manager.imageId}
          subjectName={manager.managerName}
          era={manager.era}
          countryCode={manager.countryCode}
          tournamentYear={manager.tournamentYear}
          size="hero"
        />
      </div>
      <div className="manager-card__copy">
        <span className="manager-card__band">
          <Crown size={13} aria-hidden /> {manager.qualityBand}
        </span>
        <h2>{manager.managerName}</h2>
        <p>
          {flagForTeamName(manager.teamName)} {manager.teamName} ·{" "}
          {manager.style}
        </p>
        <div
          className="manager-card__grades"
          aria-label={`${manager.managerName} grades: offense ${managerGradeLabel(manager.grades.offense)}, defense ${managerGradeLabel(manager.grades.defense)}`}
        >
          <span>
            <small>OFF</small>
            <b>{managerGradeLabel(manager.grades.offense)}</b>
            <i>{manager.grades.offense}</i>
          </span>
          <span>
            <small>DEF</small>
            <b>{managerGradeLabel(manager.grades.defense)}</b>
            <i>{manager.grades.defense}</i>
          </span>
          <span>
            <small>LEAD</small>
            <b>{manager.leadership}</b>
          </span>
          <span>
            <small>GAME</small>
            <b>{manager.gameManagement}</b>
          </span>
        </div>
        <blockquote>{manager.tacticalIdentity}</blockquote>
        <small className="manager-card__versions">
          Tournament versions {versionYears.join(" · ")}
        </small>
      </div>
      <div className="manager-card__footer">
        <span><ShieldCheck size={13} aria-hidden /> {manager.preferredFormations.join(" · ")}</span>
        {selected && <b><Check size={14} aria-hidden /> Selected</b>}
      </div>
      {onInspect && (
        <button
          type="button"
          className="manager-card__inspect"
          onClick={(event) => {
            event.stopPropagation();
            onInspect();
          }}
        >
          View manager record
        </button>
      )}
    </article>
  );
}
