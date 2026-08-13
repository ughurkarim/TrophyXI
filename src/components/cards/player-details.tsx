"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerAccolades } from "@/components/cards/player-accolades";
import { PlayerPortrait } from "@/components/cards/player-portrait";
import { players } from "@/data/players";
import {
  cn,
  flagForCountry,
  formatPlayerDisplayName,
} from "@/lib/utils";
import type { PlayerTournamentCard } from "@/types/game";
import styles from "./player-details.module.css";
import { useLocalizedContent } from "@/i18n/content";

const outfieldStatKeys: Array<keyof PlayerTournamentCard["tournamentStats"]> =
  ["appearances", "starts", "minutes", "goals", "assists"];

const goalkeeperStatKeys: Array<keyof PlayerTournamentCard["tournamentStats"]> =
  ["appearances", "starts", "minutes", "saves", "cleanSheets", "goalsConceded", "penaltiesSaved"];

const careerStatKeys: Array<keyof NonNullable<PlayerTournamentCard["careerStats"]>> =
  ["clubAppearances", "clubGoals", "clubAssists", "nationalTeamAppearances", "nationalTeamGoals"];

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
  const t = useTranslations("players.details");
  const localize = useLocalizedContent();
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
  const activePlayerName = formatPlayerDisplayName(activePlayer.playerName);
  const activePlayerForDisplay =
    activePlayerName === activePlayer.playerName
      ? activePlayer
      : { ...activePlayer, playerName: activePlayerName };
  const activeFitContext = activePlayer.id === player.id ? fitContext : undefined;
  const tournamentStats = (
    activePlayer.primaryPosition === "GK"
      ? goalkeeperStatKeys
      : outfieldStatKeys
  ).filter(
    (key) =>
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
      ? careerStatKeys.filter(
          (key) =>
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
          aria-label={t("close")}
          autoFocus
        >
          <X size={18} aria-hidden />
        </button>
        <div className={cn("player-drawer__hero", styles.hero)}>
          <PlayerPortrait player={activePlayerForDisplay} />
          <div className={styles.heroCopy}>
            <span className="eyebrow eyebrow--gold">
              {flagForCountry(activePlayer.countryCode)}{" "}
              {localize(activePlayer.countryName)} · {activePlayer.tournamentYear}
            </span>
            <h2 id="player-detail-title">{activePlayerName}</h2>
            <p>
              {localize(activePlayer.archetype)} · {activePlayer.primaryPosition}
            </p>
            <div
              className={`player-status player-status--${activePlayer.statusTier}`}
              aria-label={t("tierAria", { tier: t(`status.${activePlayer.statusTier}`), rating: activePlayer.overall })}
            >
              <strong>{activePlayer.overall}</strong>
              <span>{t(`status.${activePlayer.statusTier}`)}</span>
            </div>
          </div>
        </div>

        <section className={styles.versions}>
          <span className="eyebrow">{t("tournamentVersions")}</span>
          <div className={styles.versionList}>
            {versions.map((version) => {
              const current = version.id === activePlayer.id;
              const versionName = formatPlayerDisplayName(version.playerName);
              return (
                <button
                  type="button"
                  key={version.id}
                  className={cn(styles.version, current && styles.currentVersion)}
                  aria-pressed={current}
                  aria-label={t("openVersionAria", { player: versionName, year: version.tournamentYear, rating: version.overall })}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <span className={styles.versionPortrait} aria-hidden>
                    <CircularPortrait
                      imageId={version.imageId}
                      subjectName={versionName}
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
                      {current ? t("currentVersion") : t("tournamentVersion")}
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
            <span className="eyebrow">{t("tournamentRecord")}</span>
            <dl className={cn("record-grid", styles.recordGrid)}>
              {tournamentStats.map((key) => (
                <div key={key}>
                  <dt>{t(`stats.${key}`)}</dt>
                  <dd>{activePlayer.tournamentStats[key]}</dd>
                </div>
              ))}
              {activePlayer.achievements.map((item) => (
                <div key={item.id}>
                  <dt>{t("award")}</dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
              {activePlayer.tournamentFinish &&
                activePlayer.tournamentFinishSource && (
                  <div>
                    <dt>{t("finish")}</dt>
                    <dd>{activePlayer.tournamentFinish}</dd>
                  </div>
                )}
            </dl>
          </section>
        )}

        {activePlayer.careerStats && careerStats.length > 0 && (
          <section>
            <span className="eyebrow">{t("careerStatistics")}</span>
            <dl className={cn("record-grid", styles.recordGrid)}>
              {careerStats.map((key) => (
                <div key={key}>
                  <dt>{t(`stats.${key}`)}</dt>
                  <dd>{activePlayer.careerStats?.[key] as number}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {activeFitContext && (
          <section>
            <span className="eyebrow">{t("trophyXiFit")}</span>
            <dl className={cn("record-grid", styles.recordGrid)}>
              <div>
                <dt>{t("assignment")}</dt>
                <dd>{activeFitContext.assignedSlot}</dd>
              </div>
              <div>
                <dt>{t("positionFit")}</dt>
                <dd>
                  {activeFitContext.positionFit === null
                    ? t("bench")
                    : `${activeFitContext.positionFit}%`}
                </dd>
              </div>
              {Boolean(activeFitContext.placementPenalty) && (
                <div>
                  <dt>{t("placementPenalty")}</dt>
                  <dd>−{activeFitContext.placementPenalty}%</dd>
                </div>
              )}
              {activeFitContext.eraTranslation !== null && (
                <div>
                  <dt>{t("eraFit")}</dt>
                  <dd>{activeFitContext.eraTranslation}</dd>
                </div>
              )}
              {activeFitContext.eraTranslation === null && (
                <div>
                  <dt>{t("matchEnvironment")}</dt>
                  <dd>{t("neutralEnvironment")}</dd>
                </div>
              )}
              {Boolean(activeFitContext.eraImpact) && (
                <div>
                  <dt>{t("eraImpact")}</dt>
                  <dd>−{activeFitContext.eraImpact}%</dd>
                </div>
              )}
              <div>
                <dt>{t("managerFit")}</dt>
                <dd>{activeFitContext.managerFit}</dd>
              </div>
              {activeFitContext.chemistryContribution !== null && (
                <div>
                  <dt>{t("chemistryContribution")}</dt>
                  <dd>
                    {activeFitContext.chemistryContribution >= 0 ? "+" : ""}
                    {activeFitContext.chemistryContribution}
                  </dd>
                </div>
              )}
              {activeFitContext.benchPriority !== null && (
                <div>
                  <dt>{t("benchPriority")}</dt>
                  <dd>{activeFitContext.benchPriority}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section>
          <span className="eyebrow">{t("tagEffects")}</span>
          <div className={cn("modeled-tag-list", styles.tagList)}>
            {activePlayer.modeledTags.map((tag) => (
              <article key={tag}>
                <span>{tag}</span>
                <p>
                  {modeledTagCopy[tag]?.description
                    ? localize(modeledTagCopy[tag].description)
                    : t("tagDescriptionFallback")}
                </p>
                <small>
                  {modeledTagCopy[tag]?.effect
                    ? localize(modeledTagCopy[tag].effect)
                    : t("tagEffectFallback")}
                </small>
              </article>
            ))}
          </div>
        </section>

        <PlayerAccolades player={activePlayerForDisplay} />
      </aside>
    </div>
  );
}
