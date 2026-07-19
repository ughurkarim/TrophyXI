"use client";

import { Check, Crown, Shield, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { managerGradeLabel } from "@/data/managers";
import { historicalOpponents, worldCupAllStars } from "@/data/opponents";
import { playersById } from "@/data/players";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type {
  DraftEraId,
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
} from "@/types/game";
import styles from "./opponent-selection.module.css";

export function OpponentSelection({
  eraId,
  onContinue,
  onEditSquad,
}: {
  eraId: DraftEraId;
  onContinue: () => void;
  onEditSquad?: () => void;
}) {
  const selectedOpponentId = useGameStore((state) => state.selectedOpponentId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const selectOpponent = useGameStore((state) => state.selectOpponent);
  const usedIdentityIds = new Set(
    [...picks, ...benchPicks]
      .map((pick) => playersById.get(pick.cardId)?.playerIdentityId)
      .filter((id): id is string => Boolean(id)),
  );
  const conflictNamesFor = (opponent: HistoricalWorldCupTeam) =>
    [...opponent.startingLineup, ...opponent.substitutes]
      .filter((player) => usedIdentityIds.has(player.playerIdentityId))
      .map((player) => player.name);
  const conflictingChampions = historicalOpponents.filter(
    (opponent) => conflictNamesFor(opponent).length > 0,
  );
  const selected =
    selectedOpponentId === worldCupAllStars.id
      ? worldCupAllStars
      : historicalOpponents.find(
          (opponent) => opponent.id === selectedOpponentId,
        );
  const allStarsManager = worldCupAllStars.allStars!.manager;
  const managerEraFit = calculateManagerEraFit(allStarsManager, eraId).score;

  return (
    <section className="opponent-selection" aria-labelledby="opponent-heading">
      <div className="opponent-selection__heading">
        <div>
          <span className="eyebrow eyebrow--gold">WORLD CUP GAUNTLET</span>
          <h2 id="opponent-heading">Choose your opponent.</h2>
          <p>
            Face one of fourteen World Cup champions or the ultimate All-Stars
            challenge.
          </p>
        </div>
        <strong>14 CHAMPIONS</strong>
      </div>

      <section className="opponent-featured" aria-labelledby="featured-heading">
        <div className="opponent-section-heading">
          <div>
            <span className="eyebrow eyebrow--gold">FEATURED CHALLENGE</span>
            <h3 id="featured-heading">World Cup All-Stars</h3>
          </div>
          <span className="mythic-badge">
            <Sparkles size={14} aria-hidden /> MYTHIC
          </span>
        </div>
        <button
          type="button"
          className={`opponent-card opponent-card--featured ${styles.featuredCard} ${
            selectedOpponentId === worldCupAllStars.id
              ? styles.featuredSelected
              : ""
          }`}
          onClick={() => selectOpponent(worldCupAllStars.id)}
          aria-pressed={selectedOpponentId === worldCupAllStars.id}
          aria-label="Select World Cup All-Stars, Mythic difficulty"
        >
          <div className="all-stars-seal" aria-hidden>
            XI
          </div>
          <div className={styles.featuredBody}>
            <div className={`opponent-card__title ${styles.featuredTitle}`}>
              <span>WORLD CUP ALL-STARS</span>
              <span className={styles.difficulty}>
                <small>DIFFICULTY</small>
                <b>MYTHIC</b>
              </span>
            </div>
            <p className={styles.subtitle}>
              {worldCupAllStars.allStars?.subtitle}
            </p>
            <Ratings
              opponent={worldCupAllStars}
              className={styles.featuredRatings}
            />
            <div className={styles.managerProfile}>
              <div className={styles.managerHeading}>
                <span>MANAGER</span>
                <strong>
                  {allStarsManager.managerName} ·{" "}
                  {flagForCountry(allStarsManager.countryCode)}{" "}
                  {allStarsManager.countryName} {allStarsManager.tournamentYear}
                </strong>
              </div>
              <dl
                className={styles.managerMetrics}
                aria-label={`${allStarsManager.managerName} manager profile`}
              >
                {[
                  { label: "OFF", value: allStarsManager.grades.offense },
                  { label: "DEF", value: allStarsManager.grades.defense },
                  { label: "Leadership", value: allStarsManager.leadership },
                  {
                    label: "Game Management",
                    value: allStarsManager.gameManagement,
                  },
                  { label: "Era Fit", value: managerEraFit },
                ].map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>
                      <b>{managerGradeLabel(metric.value)}</b>
                      <small>{metric.value}</small>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className={styles.managerTactics}>
                <span>
                  Preferred formations{" "}
                  <b>{allStarsManager.preferredFormations.join(" · ")}</b>
                </span>
                <span>
                  Tactical style <b>{allStarsManager.style}</b>
                </span>
              </div>
            </div>
          </div>
          <SelectedMark
            selected={selectedOpponentId === worldCupAllStars.id}
            className={styles.featuredSelectionMark}
          />
        </button>
      </section>

      <section
        className="historical-opponents"
        aria-labelledby="historical-opponents-heading"
      >
        <div className="opponent-section-heading">
          <div>
            <span className="eyebrow">CHAMPIONS</span>
            <h3 id="historical-opponents-heading">
              World Cup winners, newest first
            </h3>
          </div>
          <b>{historicalOpponents.length} teams</b>
        </div>
        <div className="opponent-grid">
          {historicalOpponents.map((opponent) => (
            <OpponentCard
              key={opponent.id}
              opponent={opponent}
              eraId={eraId}
              selected={opponent.id === selectedOpponentId}
              conflictNames={conflictNamesFor(opponent)}
              onSelect={() => selectOpponent(opponent.id)}
            />
          ))}
        </div>
        {conflictingChampions.length > 0 && (
          <p className={styles.conflictNotice} role="status">
            {conflictingChampions.length}{" "}
            {conflictingChampions.length === 1 ? "champion shares" : "champions share"}{" "}
            a player with your squad.{" "}
            {onEditSquad
              ? "Edit the squad to make that opponent available."
              : "Choose another champion or World Cup All-Stars."}
          </p>
        )}
      </section>

      {selected?.kind !== "all-stars" && (
        <ChampionDossier opponent={selected} eraId={eraId} />
      )}

      <div className={`opponent-selection__continue ${styles.footer}`}>
        <div className={styles.footerCopy} aria-live="polite">
          <span className="eyebrow">SELECTED OPPONENT</span>
          <b>
            {selected?.kind === "all-stars"
              ? "World Cup All-Stars · Mythic"
              : selected
                ? `${selected.nationName} ${selected.tournamentYear}`
                : "Choose one opponent"}
          </b>
        </div>
        <div className={styles.footerActions}>
          {onEditSquad && (
            <Button variant="secondary" onClick={onEditSquad}>
              Edit squad
            </Button>
          )}
          <Button
            className={styles.tunnelButton}
            onClick={onContinue}
            disabled={!selected}
          >
            Enter the tunnel <Swords size={16} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

function Ratings({
  opponent,
  className = "",
}: {
  opponent: HistoricalWorldCupTeam;
  className?: string;
}) {
  return (
    <div
      className={`opponent-card__ratings ${className}`}
      aria-label={`${opponent.nationName} ratings`}
    >
      <span>
        ATTACK <b>{opponent.ratings.attack}</b>
      </span>
      <span>
        MIDFIELD <b>{opponent.ratings.midfield}</b>
      </span>
      <span>
        DEFENSE <b>{opponent.ratings.defense}</b>
      </span>
      <span>
        OVERALL <b>{opponent.ratings.overall}</b>
      </span>
    </div>
  );
}

function SelectedMark({
  selected,
  className,
}: {
  selected: boolean;
  className: string;
}) {
  return (
    <span
      className={`opponent-selected-mark ${className}`}
      data-visible={selected}
      aria-hidden={!selected}
    >
      <Check size={14} aria-hidden /> Selected
    </span>
  );
}

function OpponentCard({
  opponent,
  eraId,
  selected,
  conflictNames,
  onSelect,
}: {
  opponent: HistoricalWorldCupTeam;
  eraId: DraftEraId;
  selected: boolean;
  conflictNames: string[];
  onSelect: () => void;
}) {
  const unavailable = conflictNames.length > 0;
  return (
    <button
      type="button"
      className={`opponent-card opponent-card--champion ${
        styles.historicalCard
      } ${selected ? "opponent-card--selected" : ""}`}
      onClick={onSelect}
      disabled={unavailable}
      aria-pressed={selected}
      aria-controls={selected ? "selected-champion-dossier" : undefined}
      aria-label={
        unavailable
          ? `${opponent.nationName} ${opponent.tournamentYear} unavailable: ${conflictNames.join(", ")} already represents your squad`
          : `Select ${opponent.nationName} ${opponent.tournamentYear}, ${opponent.difficulty} difficulty`
      }
    >
      <div className="opponent-card__title">
        <span>
          {opponent.nationCode}{" "}
          <i aria-hidden>{flagForCountry(opponent.nationCode)}</i>
        </span>
        <b>{opponent.tournamentYear}</b>
      </div>
      <h3>
        <Crown size={14} aria-label="Champion" />
        {opponent.nationName}
      </h3>
      <p>World Cup Champion</p>
      <Ratings opponent={opponent} />
      <div className={`opponent-card__dossier ${styles.tacticalLabel}`}>
        <span>{opponent.tacticalProfile}</span>
      </div>
      <div className="opponent-card__meta">
        <span>
          <Shield size={12} aria-hidden />{" "}
          {opponent.formationLabel ?? opponent.formation}
        </span>
        <span>ERA {calculateOpponentEraFit(opponent, eraId)}</span>
        <span>{opponent.difficulty}</span>
      </div>
      {unavailable && (
        <span className={styles.conflictLabel}>SQUAD CONFLICT</span>
      )}
      <SelectedMark
        selected={selected}
        className={styles.cardSelectionMark}
      />
    </button>
  );
}

function PlayerList({
  players,
  label,
}: {
  players: HistoricalLineupPlayer[];
  label: string;
}) {
  return (
    <ol className={styles.squadList} aria-label={label}>
      {players.map((player) => (
        <li key={`${player.playerIdentityId}-${player.position}`}>
          <span>{player.position}</span>
          <b>{player.name}</b>
          {player.rating !== undefined && <small>{player.rating}</small>}
        </li>
      ))}
    </ol>
  );
}

function ChampionDossier({
  opponent,
  eraId,
}: {
  opponent?: HistoricalWorldCupTeam;
  eraId: DraftEraId;
}) {
  if (!opponent) return null;

  return (
    <section
      id="selected-champion-dossier"
      className={styles.championDossier}
      aria-labelledby="selected-champion-heading"
      aria-live="polite"
    >
      <header className={styles.dossierHeader}>
        <div>
          <span className="eyebrow eyebrow--gold">SELECTED CHAMPION</span>
          <h3 id="selected-champion-heading">
            {flagForCountry(opponent.nationCode)} {opponent.nationName}{" "}
            {opponent.tournamentYear}
          </h3>
        </div>
        <span className={styles.dossierDifficulty}>
          {opponent.difficulty} · ERA{" "}
          {calculateOpponentEraFit(opponent, eraId)}
        </span>
      </header>

      <div className={styles.dossierSummary}>
        <dl>
          <div>
            <dt>Manager</dt>
            <dd>{opponent.managerName}</dd>
          </div>
          <div>
            <dt>Formation</dt>
            <dd>{opponent.formationLabel ?? opponent.formation}</dd>
          </div>
        </dl>
        <p>{opponent.tacticalProfile}</p>
        {opponent.championFact && (
          <blockquote>{opponent.championFact}</blockquote>
        )}
        <Ratings opponent={opponent} className={styles.dossierRatings} />
      </div>

      <div className={styles.squadColumns}>
        <section aria-labelledby="starting-xi-heading">
          <span className="eyebrow" id="starting-xi-heading">
            STARTING XI
          </span>
          <PlayerList
            players={opponent.startingLineup}
            label={`${opponent.nationName} ${opponent.tournamentYear} starting eleven`}
          />
        </section>
        <section aria-labelledby="available-substitutes-heading">
          <span className="eyebrow" id="available-substitutes-heading">
            AVAILABLE SUBSTITUTES
          </span>
          <PlayerList
            players={opponent.substitutes}
            label={`${opponent.nationName} ${opponent.tournamentYear} available substitutes`}
          />
        </section>
      </div>
    </section>
  );
}
