"use client";

import { X } from "lucide-react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { managerGradeLabel } from "@/data/managers";
import { historicalOpponents } from "@/data/opponents";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry, flagForTeamName } from "@/lib/utils";
import type { DraftEraId, ManagerTournamentCard } from "@/types/game";
import styles from "./manager-details.module.css";

export function ManagerDetails({
  manager,
  eraId = "all",
  onClose,
}: {
  manager: ManagerTournamentCard;
  eraId?: DraftEraId;
  onClose: () => void;
}) {
  const eraFit = calculateManagerEraFit(manager, eraId);
  const tournamentRecord = historicalOpponents.find(
    (opponent) =>
      opponent.tournamentYear === manager.tournamentYear &&
      opponent.nationName === manager.teamName,
  );
  const weaknesses = [
    manager.grades.offense < 78
      ? "Attacking plans can lack variety against a settled defense."
      : null,
    manager.grades.defense < 78
      ? "The defensive structure can leave avoidable space."
      : null,
    manager.acceptableFormations.length <= 4
      ? "Works best within a narrower range of formations."
      : null,
    eraFit.applicable && eraFit.score < 75
      ? "The selected match environment asks for significant tactical adaptation."
      : null,
  ].filter((item): item is string => Boolean(item));
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="player-drawer manager-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <button
          className="icon-button player-drawer__close"
          onClick={onClose}
          aria-label="Close manager record"
          autoFocus
        >
          <X size={18} aria-hidden />
        </button>
        <div className="manager-detail-hero">
          <CircularPortrait
            imageId={manager.imageId}
            subjectName={manager.managerName}
            era={manager.era}
            countryCode={manager.countryCode}
            tournamentYear={manager.tournamentYear}
            size="hero"
          />
          <div>
            <span className="eyebrow eyebrow--gold">
              {flagForCountry(manager.countryCode)} {manager.countryName} ·{" "}
              {flagForTeamName(manager.teamName)} {manager.teamName}{" "}
              {manager.tournamentYear}
            </span>
            <h2 id="manager-detail-title">{manager.managerName}</h2>
            <p>{manager.tacticalIdentity}</p>
          </div>
        </div>
        <section>
          <span className="eyebrow">MANAGER RECORD</span>
          <dl
            className={`record-grid manager-detail-grades ${styles.metrics}`}
          >
            <div>
              <dt>OFF</dt>
              <dd>
                {managerGradeLabel(manager.grades.offense)}{" "}
                <small>{manager.grades.offense}</small>
              </dd>
            </div>
            <div>
              <dt>DEF</dt>
              <dd>
                {managerGradeLabel(manager.grades.defense)}{" "}
                <small>{manager.grades.defense}</small>
              </dd>
            </div>
            <div>
              <dt>Leadership</dt>
              <dd>
                {managerGradeLabel(manager.leadership)}{" "}
                <small>{manager.leadership}</small>
              </dd>
            </div>
            <div>
              <dt>Game management</dt>
              <dd>
                {managerGradeLabel(manager.gameManagement)}{" "}
                <small>{manager.gameManagement}</small>
              </dd>
            </div>
            {eraFit.applicable && (
              <div>
                <dt>Era Fit</dt>
                <dd>
                  {managerGradeLabel(eraFit.score)} <small>{eraFit.score}</small>
                </dd>
              </div>
            )}
          </dl>
        </section>
        <section>
          <span className="eyebrow">TACTICAL PROFILE</span>
          <p className="data-disclosure">
            Preferred: {manager.preferredFormations.join(" · ")}
          </p>
          <p className="data-disclosure">
            Style: {manager.style} · {manager.teamName}{" "}
            {manager.tournamentYear}
          </p>
          <p className="data-disclosure">
            {eraFit.applicable
              ? `Era Fit: ${eraFit.score} · Manager tactics adapt to the selected match environment.`
              : "Neutral era — no era modifier."}
          </p>
          <div className="manager-strength-grid">
            <article>
              <b>Tactical strengths</b>
              <p>
                {manager.tacticalIdentity}. Preferred systems:{" "}
                {manager.preferredFormations.join(", ")}.
              </p>
            </article>
            <article>
              <b>Tactical weaknesses</b>
              <p>
                {weaknesses.length
                  ? weaknesses.join(" ")
                  : "No severe tactical weakness, though preferred formations still offer the clearest fit."}
              </p>
            </article>
          </div>
        </section>
        {tournamentRecord?.tournamentFinish && (
          <section>
            <span className="eyebrow">TOURNAMENT RESULT</span>
            <p className="data-disclosure">
              {manager.teamName} ·{" "}
              <b className={styles.result}>
                {tournamentRecord.tournamentFinish}
              </b>
            </p>
          </section>
        )}
        {manager.achievements.length > 0 && (
          <section>
            <span className="eyebrow">MANAGER ACCOLADES</span>
            <ul className="achievement-list">
              {manager.achievements.map((achievement) => (
                <li key={achievement.id}>
                  <b>{achievement.label}</b>
                  <p>{achievement.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
