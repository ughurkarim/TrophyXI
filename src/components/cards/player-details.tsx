"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerAccolades } from "@/components/cards/player-accolades";
import { PlayerPortrait } from "@/components/cards/player-portrait";
import { players } from "@/data/players";
import { cn, flagForCountry } from "@/lib/utils";
import type { PlayerTournamentCard } from "@/types/game";
import styles from "./player-details.module.css";

const outfieldStatLabels: Array<
  [keyof PlayerTournamentCard["tournamentStats"], string]
> = [
  ["appearances", "Appearances"],
  ["starts", "Starts"],
  ["minutes", "Minutes"],
  ["goals", "Goals"],
  ["assists", "Assists"],
];

const goalkeeperStatLabels: Array<
  [keyof PlayerTournamentCard["tournamentStats"], string]
> = [
  ["appearances", "Appearances"],
  ["starts", "Starts"],
  ["minutes", "Minutes"],
  ["saves", "Saves"],
  ["cleanSheets", "Clean sheets"],
  ["goalsConceded", "Goals conceded"],
  ["penaltiesSaved", "Penalties saved"],
];

const careerStatLabels: Array<
  [
    keyof NonNullable<PlayerTournamentCard["careerStats"]>,
    string,
  ]
> = [
  ["clubAppearances", "Club appearances"],
  ["clubGoals", "Club goals"],
  ["clubAssists", "Club assists"],
  ["nationalTeamAppearances", "National-team appearances"],
  ["nationalTeamGoals", "National-team goals"],
];

export type PlayerFitContext = {
  assignedSlot: string;
  positionFit: number | null;
  placementPenalty: number | null;
  eraTranslation: number | null;
  eraImpact?: number;
  managerFit: number;
  chemistryContribution: number | null;
  benchPriority: number | null;
};

export const modeledTagCopy: Record<
  string,
  { description: string; effect: string }
> = {
  "Final-third threat": {
    description: "Creates greater danger in and around the penalty area.",
    effect: "Sharpens attacking influence in advanced roles.",
  },
  "Chance creator": {
    description: "Finds passing lanes and creates opportunities for teammates.",
    effect: "Strengthens creative influence in possession.",
  },
  "Press resistant": {
    description: "Keeps control under pressure and connects difficult phases.",
    effect: "Supports midfield control and era adaptation.",
  },
  "Ball winner": {
    description: "Reads danger early and disrupts opposing attacks.",
    effect: "Adds defensive value in compatible roles.",
  },
  "Duel strength": {
    description: "Competes strongly in physical and aerial contests.",
    effect: "Supports defending, transitions, and adaptation.",
  },
  "Goalkeeper craft": {
    description: "Provides full goalkeeper value when assigned in goal.",
    effect: "Improves shot-stopping and defensive organization.",
  },
  "High-leverage model": {
    description: "Performs more consistently in high-pressure match states.",
    effect: "Strengthens big-match attacking influence.",
  },
  Timeless: {
    description: "Translates naturally across different match environments.",
    effect: "Protects more of the card’s quality across eras.",
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
    .map((candidate) => (candidate.id === player.id ? player : candidate))
    .sort(
      (first, second) => second.tournamentYear - first.tournamentYear,
    );
  const [selectedVersionId, setSelectedVersionId] = useState(player.id);
  const activePlayer =
    versions.find((version) => version.id === selectedVersionId) ?? player;
  const activeFitContext = activePlayer.id === player.id ? fitContext : undefined;
  const tournamentStats = (
    activePlayer.primaryPosition === "GK"
      ? goalkeeperStatLabels
      : outfieldStatLabels
  ).filter(
    ([key]) =>
      typeof activePlayer.tournamentStats[key] === "number" &&
      Boolean(activePlayer.statSourcesByField[key]),
  );
  const hasTournamentRecord =
    tournamentStats.length > 0 ||
    activePlayer.achievements.length > 0 ||
    Boolean(
      activePlayer.tournamentFinish &&
        activePlayer.tournamentFinishSource,
    );
  const careerStats =
    activePlayer.careerStats
      ? careerStatLabels.filter(
          ([key]) =>
            typeof activePlayer.careerStats?.[key] === "number",
        )
      : [];

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className={cn(
          "player-drawer",
          `player-drawer--${activePlayer.statusTier}`,
          styles.drawer,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <button
          className={cn(
            "icon-button player-drawer__close",
            styles.close,
          )}
          onClick={onClose}
          aria-label="Close player record"
          autoFocus
        >
          <X size={18} aria-hidden />
        </button>
        <div className={cn("player-drawer__hero", styles.hero)}>
          <PlayerPortrait player={activePlayer} />
          <div className={styles.heroCopy}>
            <span className="eyebrow eyebrow--gold">
              {flagForCountry(activePlayer.countryCode)}{" "}
              {activePlayer.countryName} · {activePlayer.tournamentYear}
            </span>
            <h2 id="player-detail-title">{activePlayer.playerName}</h2>
            <p>
              {activePlayer.archetype} · {activePlayer.primaryPosition}
            </p>
            <div
              className={`player-status player-status--${activePlayer.statusTier}`}
              aria-label={`${activePlayer.statusTier} tier, ${activePlayer.overall} overall`}
            >
              <strong>{activePlayer.overall}</strong>
              <span>{activePlayer.statusTier.replace("-", " ")}</span>
            </div>
          </div>
        </div>

        <section className={styles.versions}>
          <span className="eyebrow">TOURNAMENT VERSIONS</span>
          <div className={styles.versionList}>
            {versions.map((version) => {
              const current = version.id === activePlayer.id;
              return (
                <button
                  type="button"
                  key={version.id}
                  className={cn(styles.version, current && styles.currentVersion)}
                  aria-pressed={current}
                  aria-label={`Open ${version.playerName} ${version.tournamentYear} card, rated ${version.overall}`}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <span className={styles.versionPortrait} aria-hidden>
                    <CircularPortrait
                      imageId={version.imageId}
                      subjectName={version.playerName}
                      era={version.era}
                      statusTier={version.statusTier}
                      countryCode={version.countryCode}
                      tournamentYear={version.tournamentYear}
                      size="compact"
                    />
                  </span>
                  <span>
                    <b>{version.tournamentYear}</b>
                    <small>
                      {current ? "Current version" : "Tournament version"}
                    </small>
                  </span>
                  <strong>{version.overall}</strong>
                  <i>{version.primaryPosition}</i>
                </button>
              );
            })}
          </div>
        </section>

        {hasTournamentRecord && (
          <section>
            <span className="eyebrow">TOURNAMENT RECORD</span>
            <dl className={cn("record-grid", styles.recordGrid)}>
              {tournamentStats.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{activePlayer.tournamentStats[key]}</dd>
                </div>
              ))}
              {activePlayer.achievements.map((item) => (
                <div key={item.id}>
                  <dt>Award</dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
              {activePlayer.tournamentFinish &&
                activePlayer.tournamentFinishSource && (
                  <div>
                    <dt>Finish</dt>
                    <dd>{activePlayer.tournamentFinish}</dd>
                  </div>
                )}
            </dl>
          </section>
        )}

        {activePlayer.careerStats && careerStats.length > 0 && (
          <section>
            <span className="eyebrow">CAREER STATISTICS</span>
            <dl className={cn("record-grid", styles.recordGrid)}>
              {careerStats.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{activePlayer.careerStats?.[key] as number}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {activeFitContext && (
          <section>
            <span className="eyebrow">TROPHY XI FIT</span>
            <dl className={cn("record-grid", styles.recordGrid)}>
              <div>
                <dt>Assignment</dt>
                <dd>{activeFitContext.assignedSlot}</dd>
              </div>
              <div>
                <dt>Position Fit</dt>
                <dd>
                  {activeFitContext.positionFit === null
                    ? "Bench"
                    : `${activeFitContext.positionFit}%`}
                </dd>
              </div>
              {Boolean(activeFitContext.placementPenalty) && (
                <div>
                  <dt>Placement Penalty</dt>
                  <dd>−{activeFitContext.placementPenalty}%</dd>
                </div>
              )}
              {activeFitContext.eraTranslation !== null && (
                <div>
                  <dt>Era Fit</dt>
                  <dd>{activeFitContext.eraTranslation}</dd>
                </div>
              )}
              {activeFitContext.eraTranslation === null && (
                <div>
                  <dt>Match environment</dt>
                  <dd>Neutral — no era modifier</dd>
                </div>
              )}
              {Boolean(activeFitContext.eraImpact) && (
                <div>
                  <dt>Era Impact</dt>
                  <dd>−{activeFitContext.eraImpact}%</dd>
                </div>
              )}
              <div>
                <dt>Manager Fit</dt>
                <dd>{activeFitContext.managerFit}</dd>
              </div>
              {activeFitContext.chemistryContribution !== null && (
                <div>
                  <dt>Chemistry contribution</dt>
                  <dd>
                    {activeFitContext.chemistryContribution >= 0 ? "+" : ""}
                    {activeFitContext.chemistryContribution}
                  </dd>
                </div>
              )}
              {activeFitContext.benchPriority !== null && (
                <div>
                  <dt>Bench priority</dt>
                  <dd>{activeFitContext.benchPriority}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section>
          <span className="eyebrow">PLAYER TAG EFFECTS</span>
          <div className={cn("modeled-tag-list", styles.tagList)}>
            {activePlayer.modeledTags.map((tag) => (
              <article key={tag}>
                <span>{tag}</span>
                <p>
                  {modeledTagCopy[tag]?.description ??
                    "Supports this card’s tactical identity and role."}
                </p>
                <small>
                  {modeledTagCopy[tag]?.effect ??
                    "Adds value when the role and system fit."}
                </small>
              </article>
            ))}
          </div>
        </section>

        <PlayerAccolades player={activePlayer} />
      </aside>
    </div>
  );
}
