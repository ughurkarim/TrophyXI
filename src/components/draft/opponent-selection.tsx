"use client";

import { Search, Shield, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { historicalOpponents } from "@/data/opponents/generated";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { useGameStore } from "@/store/game-store";
import type { DraftEraId, HistoricalWorldCupTeam } from "@/types/game";

const PAGE_SIZE = 24;

const unique = (values: string[]) => [...new Set(values)].sort();

const matchesFilters = (
  opponent: HistoricalWorldCupTeam,
  filters: ReturnType<typeof useGameStore.getState>["opponentFilters"],
) => {
  const query = filters.query.trim().toLocaleLowerCase();
  return (
    (!query ||
      `${opponent.nationName} ${opponent.tournamentYear}`
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
    () => historicalOpponents.filter((opponent) => matchesFilters(opponent, filters)),
    [filters],
  );
  const years = unique(
    historicalOpponents.map((opponent) => String(opponent.tournamentYear)),
  );
  const nations = unique(
    historicalOpponents.map((opponent) => opponent.nationName),
  );
  const selected = historicalOpponents.find(
    (opponent) => opponent.id === selectedOpponentId,
  );

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
          <h2 id="opponent-heading">Choose a nation-year opponent.</h2>
          <p>
            {historicalOpponents.length} verified participants from every men&apos;s
            World Cup between 1970 and 2022. Ratings and tactical labels are
            original Trophy XI models; missing factual fields remain unsourced.
          </p>
        </div>
        <strong>{filtered.length} teams</strong>
      </div>

      <div className="opponent-filters" aria-label="Historical opponent filters">
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
              historicalOpponents.map((opponent) => opponent.tournamentFinish),
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
              historicalOpponents.map((opponent) => opponent.confederation),
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
            {["Underdog", "Contender", "Elite", "Legendary"].map(
              (difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ),
            )}
          </select>
        </label>
        <label className="champion-filter">
          <input
            type="checkbox"
            checked={filters.championOnly}
            onChange={(event) =>
              update({ championOnly: event.target.checked })
            }
          />
          Champions only
        </label>
      </div>

      <div className="opponent-grid" aria-live="polite">
        {filtered.slice(0, visibleCount).map((opponent) => {
          const selectedCard = opponent.id === selectedOpponentId;
          return (
            <button
              type="button"
              key={opponent.id}
              className={`opponent-card ${selectedCard ? "opponent-card--selected" : ""}`}
              onClick={() => selectOpponent(opponent.id)}
              aria-pressed={selectedCard}
              aria-label={`Select ${opponent.nationName} ${opponent.tournamentYear}, ${opponent.difficulty} difficulty`}
            >
              <div className="opponent-card__title">
                <span>{opponent.nationCode}</span>
                <b>{opponent.tournamentYear}</b>
              </div>
              <h3>{opponent.nationName}</h3>
              <p>{opponent.tournamentFinish}</p>
              <div className="opponent-card__ratings">
                <span>ATK <b>{opponent.ratings.attack}</b></span>
                <span>MID <b>{opponent.ratings.midfield}</b></span>
                <span>DEF <b>{opponent.ratings.defense}</b></span>
                <span>OVR <b>{opponent.ratings.overall}</b></span>
              </div>
              <div className="opponent-card__meta">
                <span><Shield size={12} aria-hidden /> {opponent.formation}</span>
                <span>
                  ERA {calculateOpponentEraFit(opponent, eraId)}
                </span>
                <span>{opponent.difficulty}</span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="opponent-empty">No historical opponents match these filters.</p>
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
          <b>
            {selected
              ? `${selected.nationName} ${selected.tournamentYear}`
              : "Choose one nation-year record"}
          </b>
        </div>
        <Button onClick={onContinue} disabled={!selected}>
          Enter the tunnel <Swords size={16} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
