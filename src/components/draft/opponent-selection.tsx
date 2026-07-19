"use client";

import { Check, Crown, Search, Shield, Sparkles, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { managerGradeLabel } from "@/data/managers";
import { historicalOpponents, worldCupAllStars } from "@/data/opponents";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { useGameStore } from "@/store/game-store";
import { WORLD_CUP_YEARS } from "@/types/game";
import type { DraftEraId, HistoricalWorldCupTeam } from "@/types/game";
import { flagForCountry } from "@/lib/utils";
import styles from "./opponent-selection.module.css";

const PAGE_SIZE = 24;

const unique = (values: string[]) => [...new Set(values)].sort();

const matchesFilters = (
  opponent: HistoricalWorldCupTeam,
  filters: ReturnType<typeof useGameStore.getState>["opponentFilters"],
) => {
  const query = filters.query.trim().toLocaleLowerCase();
  return (
    (!query ||
      `${opponent.nationName} ${opponent.tournamentYear ?? ""}`
        .toLocaleLowerCase()
        .includes(query)) &&
    (filters.year === null || opponent.tournamentYear === filters.year) &&
    (!filters.nation || opponent.nationName === filters.nation) &&
    (!filters.finish || opponent.tournamentFinish === filters.finish) &&
    (!filters.confederation ||
      opponent.confederation === filters.confederation) &&
    (!filters.difficulty || opponent.difficulty === filters.difficulty) &&
    (!filters.championOnly || opponent.tournamentFinish === "champion")
  );
};

export function OpponentSelection({
  eraId,
  onContinue,
}: {
  eraId: DraftEraId;
  onContinue: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const filters = useGameStore((state) => state.opponentFilters);
  const selectedOpponentId = useGameStore((state) => state.selectedOpponentId);
  const setFilters = useGameStore((state) => state.setOpponentFilters);
  const selectOpponent = useGameStore((state) => state.selectOpponent);

  const filtered = useMemo(
    () =>
      historicalOpponents.filter((opponent) =>
        matchesFilters(opponent, filters),
      ),
    [filters],
  );
  const years = WORLD_CUP_YEARS.filter((year) =>
    historicalOpponents.some((opponent) => opponent.tournamentYear === year),
  );
  const nations = unique(
    historicalOpponents.map((opponent) => opponent.nationName),
  );
  const selected =
    selectedOpponentId === worldCupAllStars.id
      ? worldCupAllStars
      : historicalOpponents.find(
          (opponent) => opponent.id === selectedOpponentId,
        );
  const allStarsManager = worldCupAllStars.allStars!.manager;
  const managerEraFit = calculateManagerEraFit(allStarsManager, eraId).score;
  const selectedFooterLabel =
    selected?.kind === "all-stars"
      ? "World Cup All-Stars · Mythic"
      : selected
        ? `${selected.nationName} ${selected.tournamentYear}`
        : "Choose one opponent";
  const visible = filtered.slice(0, visibleCount);
  const groups = years
    .map((year) => ({
      year,
      opponents: visible.filter(
        (opponent) => opponent.tournamentYear === year,
      ),
    }))
    .filter((group) => group.opponents.length > 0);

  const update = (
    updateFilters: Parameters<typeof setFilters>[0],
  ) => {
    setVisibleCount(PAGE_SIZE);
    setFilters(updateFilters);
  };

  return (
    <section className="opponent-selection" aria-labelledby="opponent-heading">
      <div className="opponent-selection__heading">
        <div>
          <span className="eyebrow eyebrow--gold">WORLD CUP GAUNTLET</span>
          <h2 id="opponent-heading">Choose your opponent.</h2>
          <p>
            The archive includes sourced participants from 1970–2026. Unknown
            current-tournament results remain unknown. Ratings, formations,
            and Era Translation shape each matchup.
          </p>
        </div>
        <strong>
          {filters.championOnly ? "CHAMPIONS ONLY" : `${filtered.length} TEAMS`}
        </strong>
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
            <div
              className={`opponent-card__ratings ${styles.featuredRatings}`}
              aria-label="World Cup All-Stars ratings"
            >
              <span>
                ATTACK <b>{worldCupAllStars.ratings.attack}</b>
              </span>
              <span>
                MIDFIELD <b>{worldCupAllStars.ratings.midfield}</b>
              </span>
              <span>
                DEFENSE <b>{worldCupAllStars.ratings.defense}</b>
              </span>
              <span>
                OVERALL <b>{worldCupAllStars.ratings.overall}</b>
              </span>
            </div>
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
                  {
                    label: "OFF",
                    value: allStarsManager.grades.offense,
                  },
                  {
                    label: "DEF",
                    value: allStarsManager.grades.defense,
                  },
                  {
                    label: "Leadership",
                    value: allStarsManager.leadership,
                  },
                  {
                    label: "Game Management",
                    value: allStarsManager.gameManagement,
                  },
                  {
                    label: "Era Fit",
                    value: managerEraFit,
                  },
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
          <span
            className={`opponent-selected-mark ${styles.featuredSelectionMark}`}
            data-visible={selectedOpponentId === worldCupAllStars.id}
            aria-hidden={selectedOpponentId !== worldCupAllStars.id}
          >
            <Check size={14} aria-hidden /> Selected
          </span>
        </button>
      </section>

      <div
        className={`opponent-filters ${styles.filterBar}`}
        aria-label="Historical opponent filters"
      >
        <label className="champion-filter">
          <span>CHAMPIONS ONLY</span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Champions Only"
            checked={filters.championOnly}
            onChange={(event) =>
              update({ championOnly: event.target.checked })
            }
          />
          <i aria-hidden>{filters.championOnly ? "ON" : "OFF"}</i>
        </label>
        <label className="opponent-search">
          <span className="sr-only">Search opponents</span>
          <Search size={16} aria-hidden />
          <input
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="Search nation or year"
          />
        </label>
        <label>
          <span className="sr-only">Tournament year</span>
          <select
            aria-label="Tournament year"
            value={filters.year ?? ""}
            onChange={(event) =>
              update({
                year: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Nation</span>
          <select
            aria-label="Nation"
            value={filters.nation}
            onChange={(event) => update({ nation: event.target.value })}
          >
            <option value="">All nations</option>
            {nations.map((nation) => (
              <option key={nation}>{nation}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Tournament finish</span>
          <select
            aria-label="Tournament finish"
            value={filters.finish}
            onChange={(event) => update({ finish: event.target.value })}
          >
            <option value="">All finishes</option>
            {unique(
              historicalOpponents
                .map((opponent) => opponent.tournamentFinish)
                .filter((finish): finish is NonNullable<typeof finish> =>
                  Boolean(finish),
                ),
            ).map((finish) => (
              <option key={finish}>{finish}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Confederation</span>
          <select
            aria-label="Confederation"
            value={filters.confederation}
            onChange={(event) =>
              update({ confederation: event.target.value })
            }
          >
            <option value="">All confederations</option>
            {unique(
              historicalOpponents
                .map((opponent) => opponent.confederation)
                .filter(
                  (confederation): confederation is NonNullable<
                    typeof confederation
                  > => Boolean(confederation),
                ),
            ).map((confederation) => (
              <option key={confederation}>{confederation}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Difficulty</span>
          <select
            aria-label="Difficulty"
            value={filters.difficulty}
            onChange={(event) => update({ difficulty: event.target.value })}
          >
            <option value="">All difficulties</option>
            {["Underdog", "Contender", "Elite", "Legendary", "Mythic"].map(
              (difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ),
            )}
          </select>
        </label>
      </div>

      <section
        className="historical-opponents"
        aria-labelledby="historical-opponents-heading"
      >
        <div className="opponent-section-heading">
          <div>
            <span className="eyebrow">
              {filters.championOnly ? "CHAMPIONS" : "ALL HISTORICAL TEAMS"}
            </span>
            <h3 id="historical-opponents-heading">
              {filters.championOnly
                ? "World Cup winners, newest first"
                : "Complete participant archive"}
            </h3>
          </div>
          <b>{filtered.length} records</b>
        </div>

        {filters.championOnly ? (
          <div className="opponent-grid" aria-live="polite">
            {visible.map((opponent) => (
              <OpponentCard
                key={opponent.id}
                opponent={opponent}
                eraId={eraId}
                selected={opponent.id === selectedOpponentId}
                onSelect={() => selectOpponent(opponent.id)}
              />
            ))}
          </div>
        ) : (
          <div className="opponent-year-groups" aria-live="polite">
            {groups.map((group) => (
              <section key={group.year} aria-labelledby={`year-${group.year}`}>
                <h4 id={`year-${group.year}`}>
                  {group.year}
                  {group.year === 2026 && <small>Tournament in progress</small>}
                </h4>
                <div className="opponent-grid">
                  {group.opponents.map((opponent) => (
                    <OpponentCard
                      key={opponent.id}
                      opponent={opponent}
                      eraId={eraId}
                      selected={opponent.id === selectedOpponentId}
                      onSelect={() => selectOpponent(opponent.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {filtered.length === 0 && (
        <p className="opponent-empty">
          No historical opponents match these filters. The featured All-Stars
          challenge remains available.
        </p>
      )}
      {visibleCount < filtered.length && (
        <Button
          variant="secondary"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Show more teams
        </Button>
      )}

      <div className={`opponent-selection__continue ${styles.footer}`}>
        <div className={styles.footerCopy}>
          <span className="eyebrow">SELECTED OPPONENT</span>
          <b>{selectedFooterLabel}</b>
        </div>
        <Button
          className={styles.tunnelButton}
          onClick={onContinue}
          disabled={!selected}
        >
          Enter the tunnel <Swords size={16} aria-hidden />
        </Button>
      </div>
    </section>
  );
}

function OpponentCard({
  opponent,
  eraId,
  selected,
  onSelect,
}: {
  opponent: HistoricalWorldCupTeam;
  eraId: DraftEraId;
  selected: boolean;
  onSelect: () => void;
}) {
  const champion = opponent.tournamentFinish === "champion";
  return (
    <button
      type="button"
      className={`opponent-card ${styles.historicalCard} ${
        selected ? "opponent-card--selected" : ""
      } ${champion ? "opponent-card--champion" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${opponent.nationName} ${opponent.tournamentYear}, ${opponent.difficulty} difficulty`}
    >
      <div className="opponent-card__title">
        <span>
          {opponent.nationCode}{" "}
          <i aria-hidden>{flagForCountry(opponent.nationCode)}</i>
        </span>
        <b>{opponent.tournamentYear}</b>
      </div>
      <h3>
        {champion && <Crown size={14} aria-label="Champion" />}
        {opponent.nationName}
      </h3>
      <p>
        {champion
          ? "World Cup Champion"
          : opponent.tournamentFinish ?? "Tournament in progress"}
      </p>
      <div className="opponent-card__ratings">
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
      <div className={`opponent-card__dossier ${styles.tacticalLabel}`}>
        <span>{opponent.tacticalProfile}</span>
      </div>
      <div className="opponent-card__meta">
        <span>
          <Shield size={12} aria-hidden /> {opponent.formation}
        </span>
        <span>ERA {calculateOpponentEraFit(opponent, eraId)}</span>
        <span>{opponent.difficulty}</span>
      </div>
      <span
        className={`opponent-selected-mark ${styles.cardSelectionMark}`}
        data-visible={selected}
        aria-hidden={!selected}
      >
        <Check size={14} aria-hidden /> Selected
      </span>
    </button>
  );
}
