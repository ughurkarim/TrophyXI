"use client";

import { X } from "lucide-react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { managerGradeLabel, managers } from "@/data/managers";
import { imagesById } from "@/data/player-images";
import { flagForCountry, flagForTeamName } from "@/lib/utils";
import type { ManagerTournamentCard } from "@/types/game";

export function ManagerDetails({
  manager,
  onClose,
}: {
  manager: ManagerTournamentCard;
  onClose: () => void;
}) {
  const versions = managers
    .filter(
      (candidate) =>
        candidate.managerIdentityId === manager.managerIdentityId,
    )
    .sort((first, second) => second.tournamentYear - first.tournamentYear);
  const image = imagesById.get(manager.imageId);
  const weaknesses = [
    manager.grades.offense < 78
      ? "Attacking grade is below the active-manager B range."
      : null,
    manager.grades.defense < 78
      ? "Defensive grade is below the active-manager B range."
      : null,
    manager.acceptableFormations.length <= 4
      ? "Narrower modeled formation compatibility."
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
          <span className="eyebrow">TOURNAMENT MODEL</span>
          <dl className="record-grid manager-detail-grades">
            <div>
              <dt>Offense</dt>
              <dd>
                {managerGradeLabel(manager.grades.offense)}{" "}
                <small>{manager.grades.offense}</small>
              </dd>
            </div>
            <div>
              <dt>Defense</dt>
              <dd>
                {managerGradeLabel(manager.grades.defense)}{" "}
                <small>{manager.grades.defense}</small>
              </dd>
            </div>
            <div>
              <dt>Leadership</dt>
              <dd>{manager.leadership}</dd>
            </div>
            <div>
              <dt>Game management</dt>
              <dd>{manager.gameManagement}</dd>
            </div>
          </dl>
        </section>
        <section>
          <span className="eyebrow">TACTICAL FIT</span>
          <p className="data-disclosure">
            Preferred: {manager.preferredFormations.join(" · ")}
          </p>
          <p className="data-disclosure">
            Style: {manager.style} · Era model: {manager.era}
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
                  : "No severe grade weakness; non-preferred formations still reduce Manager Fit."}
              </p>
            </article>
          </div>
        </section>
        <section>
          <span className="eyebrow">TROPHY XI MANAGER TAGS</span>
          <div className="modeled-tag-list manager-tag-list">
            <article>
              <span>{manager.style}</span>
              <p>Shapes the manager’s capped simulation modifiers.</p>
              <small>Production manager-fit model</small>
            </article>
            <article>
              <span>
                {manager.leadership >= 85
                  ? "Leadership presence"
                  : "Measured leadership"}
              </span>
              <p>Influences the manager profile without becoming an overall.</p>
              <small>Leadership {manager.leadership} / 99</small>
            </article>
          </div>
        </section>
        <section>
          <span className="eyebrow">MANAGER ACCOLADES</span>
          {manager.achievements.length ? (
            <ul className="achievement-list">
              {manager.achievements.map((achievement) => (
                <li key={achievement.id}>
                  <b>{achievement.label}</b>
                  <p>{achievement.description}</p>
                  <a
                    href={achievement.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {achievement.source.publisher}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="data-disclosure">
              No manager accolade is displayed without a card-level source.
            </p>
          )}
        </section>
        <section>
          <span className="eyebrow">PHOTO STATUS</span>
          <p className="data-disclosure">
            {image
              ? `Exact-year local face · ${manager.managerName} ${manager.tournamentYear}.`
              : `Photo Pending · no exact-year local face is stored for ${manager.managerName} ${manager.tournamentYear}.`}
          </p>
        </section>
        {image?.sourcePage && (
          <section>
            <span className="eyebrow">PORTRAIT SOURCE</span>
            <p className="data-disclosure">
              {flagForCountry(manager.countryCode)} {manager.countryName} ·{" "}
              {image.photoContext === "same-year-game-face"
                ? `${image.gameEdition} game face · represents ${image.tournamentYear}`
                : `${image.photoContext.replaceAll("-", " ")}${
                    image.photographedYear
                      ? ` · photographed ${image.photographedYear}`
                      : " · photograph date not stated"
                  }`}
            </p>
            <a href={image.sourcePage} target="_blank" rel="noreferrer">
              {image.author} · {image.license}
            </a>
            <p className="data-disclosure">{image.requiredAttribution}</p>
          </section>
        )}
        <section>
          <span className="eyebrow">ARCHIVE VERSIONS</span>
          <p className="data-disclosure">
            {versions
              .map(
                (version) =>
                  `${version.teamName} ${version.tournamentYear}${
                    version.isDraftEligible ? "" : " · research"
                  }`,
              )
              .join(" / ")}
          </p>
        </section>
        <p className="rating-disclosure">
          Grades and manager effects are original Trophy XI estimates, not
          official historical ratings.
        </p>
      </aside>
    </div>
  );
}
