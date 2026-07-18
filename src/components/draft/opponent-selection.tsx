"use client";

import { Check, Crown, Search, Shield, Sparkles, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getOpponentLabel,
  historicalOpponents,
  worldCupAllStars,
} from "@/data/opponents";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { useGameStore } from "@/store/game-store";
import { WORLD_CUP_YEARS } from "@/types/game";
import type { DraftEraId, HistoricalWorldCupTeam } from "@/types/game";
import { flagForCountry } from "@/lib/utils";

const PAGE_SIZE = 24;

const unique = (values: string[]) => [...new Set(values)].sort();

const hasDataStatus = (
  opponent: HistoricalWorldCupTeam,
  status: string,
) => {
  if (!status) return true;
  if (status === "verified") return opponent.startingLineup.length === 11;
  if (status === "partial") {
    return (
      opponent.sources.length > 0 &&
      (opponent.startingLineup.length === 0 || !opponent.managerName)
    );
  }
  return opponent.formationIsModel && opponent.startingLineup.length === 0;
};

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
    hasDataStatus(opponent, filters.dataStatus) &&
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
            current-tournament results remain unknown; tactical ratings and
            formations are clearly labeled Trophy XI models.
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
          className={`opponent-card opponent-card--featured ${
            selectedOpponentId === worldCupAllStars.id
              ? "opponent-card--selected"
              : ""
          }`}
          onClick={() => selectOpponent(worldCupAllStars.id)}
          aria-pressed={selectedOpponentId === worldCupAllStars.id}
          aria-label="Select World Cup All-Stars, Mythic difficulty"
        >
          <div className="all-stars-seal" aria-hidden>
            XI
          </div>
          <div className="opponent-card__title">
            <span>WORLD CUP ALL-STARS</span>
            <b>MYTHIC</b>
          </div>
          <h3>
            {flagForCountry(worldCupAllStars.nationCode)}{" "}
            {worldCupAllStars.nationName}
          </h3>
          <p>{worldCupAllStars.allStars?.subtitle}</p>
          <div className="opponent-card__ratings">
            <span>
              ATK <b>{worldCupAllStars.ratings.attack}</b>
            </span>
            <span>
              MID <b>{worldCupAllStars.ratings.midfield}</b>
            </span>
            <span>
              DEF <b>{worldCupAllStars.ratings.defense}</b>
            </span>
            <span>
              OVR <b>{worldCupAllStars.ratings.overall}</b>
            </span>
          </div>
          <div className="opponent-card__meta">
            <span>
              <Shield size={12} aria-hidden /> {worldCupAllStars.formation}
            </span>
            <span>
              ERA {calculateOpponentEraFit(worldCupAllStars, eraId)}
            </span>
            <span>{worldCupAllStars.managerName}</span>
            <span>Trophy XI original composite manager</span>
          </div>
          {selectedOpponentId === worldCupAllStars.id && (
            <span className="opponent-selected-mark">
              <Check size={14} aria-hidden /> Selected
            </span>
          )}
        </button>
      </section>

      <div className="opponent-filters" aria-label="Historical opponent filters">
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
        <label>
          <span className="sr-only">Historical data status</span>
          <select
            aria-label="Historical data status"
            value={filters.dataStatus}
            onChange={(event) => update({ dataStatus: event.target.value })}
          >
            <option value="">All data statuses</option>
            <option value="verified">Verified Historical Lineup</option>
            <option value="partial">Partial Historical Data</option>
            <option value="modeled">Trophy XI Modeled Lineup</option>
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

      <div className="opponent-selection__continue">
        <div>
          <span className="eyebrow">SELECTED OPPONENT</span>
          <b>{selected ? getOpponentLabel(selected) : "Choose one opponent"}</b>
        </div>
        <Button onClick={onContinue} disabled={!selected}>
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
  const status =
    opponent.startingLineup.length === 11
      ? "Verified Historical Lineup"
      : opponent.sources.length
        ? "Partial Historical Data · Trophy XI Modeled Lineup"
        : "Trophy XI Modeled Lineup";
  return (
    <button
      type="button"
      className={`opponent-card ${
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
        {champion && (
          <Crown size={14} aria-label="Champion" />
        )}
        {opponent.nationName}
      </h3>
      <p>
        {opponent.tournamentFinish ?? "Tournament in progress"}
      </p>
      <div className="opponent-card__ratings">
        <span>
          ATK <b>{opponent.ratings.attack}</b>
        </span>
        <span>
          MID <b>{opponent.ratings.midfield}</b>
        </span>
        <span>
          DEF <b>{opponent.ratings.defense}</b>
        </span>
        <span>
          OVR <b>{opponent.ratings.overall}</b>
        </span>
      </div>
      <div className="opponent-card__dossier">
        <span>Manager {opponent.managerName ?? "Not sourced"}</span>
        <span>Formation {opponent.formation} · Trophy XI model</span>
        <span>{status}</span>
      </div>
      <div className="opponent-card__meta">
        <span>
          <Shield size={12} aria-hidden /> {opponent.formation}
        </span>
        <span>ERA {calculateOpponentEraFit(opponent, eraId)}</span>
        <span>{opponent.difficulty}</span>
      </div>
      {selected && (
        <span className="opponent-selected-mark">
          <Check size={14} aria-hidden /> Selected
        </span>
      )}
    </button>
  );
}
