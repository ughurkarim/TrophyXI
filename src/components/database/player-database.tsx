"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerDetails } from "@/components/cards/player-details";
import { Button } from "@/components/ui/button";
import { draftEligiblePlayers } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
import type { PlayerTournamentCard } from "@/types/game";

const PAGE_SIZE = 48;

type SortId = "rating" | "name" | "newest" | "oldest";

const unique = (values: string[]) =>
  [...new Set(values)].sort((first, second) =>
    first.localeCompare(second),
  );

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

const ratingMatches = (rating: number, filter: string) => {
  if (!filter) return true;
  const [minimum, maximum] = filter.split("-").map(Number);
  return rating >= minimum && rating <= maximum;
};

export function PlayerDatabase() {
  const [query, setQuery] = useState("");
  const [nation, setNation] = useState("");
  const [year, setYear] = useState("");
  const [position, setPosition] = useState("");
  const [rating, setRating] = useState("");
  const [tier, setTier] = useState("");
  const [era, setEra] = useState("");
  const [sort, setSort] = useState<SortId>("rating");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [inspected, setInspected] =
    useState<PlayerTournamentCard | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());
    const matching = draftEligiblePlayers.filter((player) => {
      const searchableText = normalizeSearchText(
        `${player.playerName} ${player.countryName} ${player.countryCode}`,
      );

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (!nation || player.countryCode === nation) &&
        (!year || String(player.tournamentYear) === year) &&
        (!position || player.primaryPosition === position) &&
        ratingMatches(player.overall, rating) &&
        (!tier || player.statusTier === tier) &&
        (!era || player.era === era)
      );
    });
    return [...matching].sort((first, second) => {
      if (sort === "name") {
        return (
          first.playerName.localeCompare(second.playerName) ||
          second.tournamentYear - first.tournamentYear
        );
      }
      if (sort === "newest") {
        return (
          second.tournamentYear - first.tournamentYear ||
          second.overall - first.overall
        );
      }
      if (sort === "oldest") {
        return (
          first.tournamentYear - second.tournamentYear ||
          second.overall - first.overall
        );
      }
      return (
        second.overall - first.overall ||
        first.playerName.localeCompare(second.playerName)
      );
    });
  }, [era, nation, position, query, rating, sort, tier, year]);

  const visible = filtered.slice(0, visibleCount);
  const nations = unique(
    draftEligiblePlayers.map(
      (player) => `${player.countryCode}|${player.countryName}`,
    ),
  );
  const years = [
    ...new Set(draftEligiblePlayers.map((player) => player.tournamentYear)),
  ].sort((first, second) => second - first);
  const positions = unique(
    draftEligiblePlayers.map((player) => player.primaryPosition),
  );

  return (
    <>
      <section className="database-shell" aria-labelledby="database-title">
        <div className="database-heading">
          <div>
            <p className="eyebrow eyebrow--gold">THE COMPLETE CARD ARCHIVE</p>
            <h1 id="database-title">Player Database</h1>
            <p>
              Search and compare every playable tournament version in the
              active Trophy XI archive.
            </p>
          </div>
          <dl className="database-metrics">
            <div>
              <dt>Cards</dt>
              <dd>{draftEligiblePlayers.length}</dd>
            </div>
            <div>
              <dt>Identities</dt>
              <dd>
                {
                  new Set(
                    draftEligiblePlayers.map(
                      (player) => player.playerIdentityId,
                    ),
                  ).size
                }
              </dd>
            </div>
          </dl>
        </div>

        <div className="database-filters">
          <label className="database-search">
            <span>Player</span>
            <div>
              <Search size={16} aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search player or nation"
              />
            </div>
          </label>
          <DatabaseSelect
            label="Nation"
            value={nation}
            onChange={setNation}
          >
            <option value="">All nations</option>
            {nations.map((entry) => {
              const [code, name] = entry.split("|");
              return (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              );
            })}
          </DatabaseSelect>
          <DatabaseSelect label="Year" value={year} onChange={setYear}>
            <option value="">All years</option>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </DatabaseSelect>
          <DatabaseSelect
            label="Position"
            value={position}
            onChange={setPosition}
          >
            <option value="">All positions</option>
            {positions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </DatabaseSelect>
          <DatabaseSelect
            label="Rating"
            value={rating}
            onChange={setRating}
          >
            <option value="">All ratings</option>
            {["95-99", "90-94", "85-89", "80-84", "75-79", "70-74", "65-69"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </DatabaseSelect>
          <DatabaseSelect label="Tier" value={tier} onChange={setTier}>
            <option value="">All tiers</option>
            {[
              "legend",
              "icon",
              "elite",
              "standout",
              "reliable",
              "role-player",
              "limited",
            ].map((value) => (
              <option key={value} value={value}>
                {value.replace("-", " ")}
              </option>
            ))}
          </DatabaseSelect>
          <DatabaseSelect label="Era" value={era} onChange={setEra}>
            <option value="">All eras</option>
            {["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </DatabaseSelect>
          <DatabaseSelect
            label="Sort"
            value={sort}
            onChange={(value) => setSort(value as SortId)}
          >
            <option value="rating">Rating</option>
            <option value="name">Name</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </DatabaseSelect>
        </div>

        <div className="database-results-heading" role="status" aria-live="polite">
          <span>
            <SlidersHorizontal size={14} aria-hidden /> {filtered.length} cards
          </span>
          <small>
            Showing {Math.min(visible.length, filtered.length)} of{" "}
            {filtered.length}
          </small>
        </div>

        <div className="database-grid">
          {visible.map((player) => {
            return (
              <button
                type="button"
                className={`database-card database-card--${player.statusTier}`}
                key={player.id}
                onClick={() => setInspected(player)}
                aria-label={`View ${player.playerName} ${player.tournamentYear}, rated ${player.overall}`}
              >
                <CircularPortrait
                  imageId={player.imageId}
                  subjectName={player.playerName}
                  era={player.era}
                  statusTier={player.statusTier}
                  countryCode={player.countryCode}
                  tournamentYear={player.tournamentYear}
                  size="standard"
                />
                <div>
                  <span>
                    {player.primaryPosition} · {player.overall} OVR
                  </span>
                  <h2 title={player.playerName}>{player.playerName}</h2>
                  <p>
                    {player.countryCode} {flagForCountry(player.countryCode)} ·{" "}
                    {player.countryName}
                  </p>
                  <small>
                    {player.tournamentYear} ·{" "}
                    {player.statusTier.replace("-", " ")}
                  </small>
                </div>
              </button>
            );
          })}
        </div>

        {visible.length === 0 && (
          <p className="database-empty">
            No tournament cards match these filters.
          </p>
        )}
        {visibleCount < filtered.length && (
          <div className="database-load-more">
            <Button
              variant="secondary"
              onClick={() =>
                setVisibleCount((current) => current + PAGE_SIZE)
              }
            >
              Load more cards
            </Button>
          </div>
        )}
      </section>

      {inspected && (
        <PlayerDetails
          player={inspected}
          onClose={() => setInspected(null)}
        />
      )}
    </>
  );
}

function DatabaseSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
