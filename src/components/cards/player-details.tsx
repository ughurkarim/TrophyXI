"use client";

import { X } from "lucide-react";
import { PlayerAccolades } from "@/components/cards/player-accolades";
import { PlayerPortrait } from "@/components/cards/player-portrait";
import { players } from "@/data/players";
import { imagesById } from "@/data/player-images";
import type { PlayerTournamentCard } from "@/types/game";
import { flagForCountry } from "@/lib/utils";

const statLabels: Array<
  [keyof PlayerTournamentCard["tournamentStats"], string]
> = [
  ["appearances", "Appearances"],
  ["starts", "Starts"],
  ["minutes", "Minutes"],
  ["goals", "Goals"],
  ["assists", "Assists"],
  ["cleanSheets", "Clean sheets"],
  ["saves", "Saves"],
];

export type PlayerFitContext = {
  assignedSlot: string;
  positionFit: number | null;
  placementPenalty: number | null;
  eraTranslation: number;
  managerFit: number;
  chemistryContribution: number | null;
  benchPriority: number | null;
};

export const modeledTagCopy: Record<
  string,
  { description: string; effect: string }
> = {
  "Final-third threat": {
    description: "Attack and clutch attributes carry more of this card’s value.",
    effect: "Uses existing attack weighting · no uncapped bonus",
  },
  "Chance creator": {
    description: "Creation and control shape midfield and attacking influence.",
    effect: "Uses existing creativity weighting · capped by team rating",
  },
  "Press resistant": {
    description: "Control supports midfield output and cross-era translation.",
    effect: "Uses existing control weighting · no flat bonus",
  },
  "Ball winner": {
    description: "Defensive influence is strongest in compatible roles.",
    effect: "Uses existing defense weighting · placement penalty still applies",
  },
  "Duel strength": {
    description: "Physical value supports defending, transitions, and adaptation.",
    effect: "Uses existing physical weighting · rating remains capped at 99",
  },
  "Goalkeeper craft": {
    description: "Goalkeeping is included only when this card fills the goal.",
    effect: "Goalkeeper weighting · outfield placement unavailable",
  },
  "High-leverage model": {
    description: "Clutch contributes inside the normal attack simulation weights.",
    effect: "18% of modeled attack blend · no separate factual claim",
  },
  Timeless: {
    description: "Trophy XI models a smaller translation penalty across eras.",
    effect: "Era Translation only · final fit capped at 99",
  },
};

export { accoladeTransition } from "@/components/cards/player-accolades";

export function PlayerDetails({
  player,
  onClose,
  fitContext,
}: {
  player: PlayerTournamentCard;
  onClose: () => void;
  fitContext?: PlayerFitContext;
}) {
  const versions = players
    .filter(
      (candidate) =>
        candidate.playerIdentityId === player.playerIdentityId,
    )
    .sort(
      (first, second) => second.tournamentYear - first.tournamentYear,
    );
  const image = imagesById.get(player.imageId);
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className={`player-drawer player-drawer--${player.statusTier}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <button
          className="icon-button player-drawer__close"
          onClick={onClose}
          aria-label="Close player record"
          autoFocus
        >
          <X size={18} aria-hidden />
        </button>
        <div className="player-drawer__hero">
          <PlayerPortrait player={player} />
          <div>
            <span className="eyebrow eyebrow--gold">
              {flagForCountry(player.countryCode)} {player.countryName} · {player.tournamentYear}
            </span>
            <h2 id="player-detail-title">{player.playerName}</h2>
            <p>{player.archetype} · {player.primaryPosition}</p>
            <div
              className={`player-status player-status--${player.statusTier}`}
              aria-label={`${player.statusTier} tier, ${player.overall} overall`}
            >
              <strong>{player.overall}</strong>
              <span>{player.statusTier.replace("-", " ")}</span>
              <small>modeled status tier</small>
            </div>
          </div>
        </div>
        <section>
          <span className="eyebrow">TOURNAMENT VERSIONS</span>
          <div className="version-photo-list">
            {versions.map((version) => (
              <span key={version.id}>
                <b>{version.tournamentYear}</b>
                <small>
                  {imagesById.has(version.imageId)
                    ? "Exact-year face"
                    : "Photo pending"}
                </small>
              </span>
            ))}
          </div>
        </section>
        <section>
          <span className="eyebrow">PHOTO STATUS</span>
          <p className="data-disclosure">
            {image
              ? `Exact-year local face · this tournament card owns image key ${player.imageId}.`
              : `Photo Pending · ${player.playerName} ${player.tournamentYear} remains fully draftable with a non-photographic identity marker.`}
          </p>
        </section>
        <section>
          <span className="eyebrow">TOURNAMENT RECORD</span>
          <dl className="record-grid">
            {statLabels.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{player.tournamentStats[key] ?? "Not sourced"}</dd>
              </div>
            ))}
          </dl>
          {player.statSources.length === 0 && (
            <p className="data-disclosure">
              No verified tournament stat line is stored for this version. Unknown values
              stay unknown and never become zero.
            </p>
          )}
        </section>
        {player.careerStats && (
          <section>
            <span className="eyebrow">CAREER STATISTICS</span>
            <dl className="record-grid">
              <div>
                <dt>Club appearances</dt>
                <dd>{player.careerStats.clubAppearances ?? "Not sourced"}</dd>
              </div>
              <div>
                <dt>Club goals</dt>
                <dd>{player.careerStats.clubGoals ?? "Not sourced"}</dd>
              </div>
              <div>
                <dt>Club assists</dt>
                <dd>{player.careerStats.clubAssists ?? "Not sourced"}</dd>
              </div>
              <div>
                <dt>National-team appearances</dt>
                <dd>
                  {player.careerStats.nationalTeamAppearances ?? "Not sourced"}
                </dd>
              </div>
              <div>
                <dt>National-team goals</dt>
                <dd>
                  {player.careerStats.nationalTeamGoals ?? "Not sourced"}
                </dd>
              </div>
            </dl>
            <p className="data-disclosure">
              {player.careerStats.coverageNote}
            </p>
            <a
              href={player.careerStats.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              FBref · retrieved {player.careerStats.retrievedOn}
            </a>
          </section>
        )}
        <section>
          <span className="eyebrow">TROPHY XI FIT</span>
          {fitContext ? (
            <dl className="record-grid">
              <div>
                <dt>Assignment</dt>
                <dd>{fitContext.assignedSlot}</dd>
              </div>
              <div>
                <dt>Position Fit</dt>
                <dd>
                  {fitContext.positionFit === null
                    ? "Bench"
                    : `${fitContext.positionFit}%`}
                </dd>
              </div>
              <div>
                <dt>Placement penalty</dt>
                <dd>
                  {fitContext.placementPenalty === null
                    ? "Not active"
                    : `−${fitContext.placementPenalty}%`}
                </dd>
              </div>
              <div>
                <dt>Era Translation</dt>
                <dd>{fitContext.eraTranslation}%</dd>
              </div>
              <div>
                <dt>Manager Fit</dt>
                <dd>{fitContext.managerFit}%</dd>
              </div>
              <div>
                <dt>Chemistry contribution</dt>
                <dd>
                  {fitContext.chemistryContribution === null
                    ? "Bench depth only"
                    : `${fitContext.chemistryContribution >= 0 ? "+" : ""}${fitContext.chemistryContribution}`}
                </dd>
              </div>
              {fitContext.benchPriority !== null && (
                <div>
                  <dt>Bench priority</dt>
                  <dd>{fitContext.benchPriority}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="data-disclosure">
              Select or place this card to calculate squad-specific fit.
            </p>
          )}
        </section>
        <section>
          <span className="eyebrow">PLAYER TAG EFFECTS</span>
          <div className="modeled-tag-list">
            {player.modeledTags.map((tag) => (
              <article key={tag}>
                <span>{tag}</span>
                <p>
                  {modeledTagCopy[tag]?.description ??
                    "A Trophy XI tactical archetype derived from this card’s modeled attributes."}
                </p>
                <small>
                  {modeledTagCopy[tag]?.effect ??
                    "No separate bonus · normal engine caps apply"}
                </small>
              </article>
            ))}
          </div>
          <p className="data-disclosure">
            Tags describe Trophy XI simulation behavior. They are separate from
            sourced tournament accolades.
          </p>
        </section>
        <PlayerAccolades player={player} />
        {image?.sourcePage && (
          <section>
            <span className="eyebrow">PORTRAIT SOURCE</span>
            <p className="data-disclosure">
              {image.photoContext.replaceAll("-", " ")}
              {image.photographedYear
                ? ` · photographed ${image.photographedYear}`
                : " · photograph date not stated"}
            </p>
            <a href={image.sourcePage} target="_blank" rel="noreferrer">
              {image.author} · {image.license}
            </a>
          </section>
        )}
        <p className="rating-disclosure">
          Overall and attribute values are original Trophy XI game estimates—not
          official FIFA ratings or factual career statistics.
        </p>
      </aside>
    </div>
  );
}
