"use client";

import {
  Check,
  ChevronDown,
  Grid3X3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  OptionHTMLAttributes,
  ReactNode,
} from "react";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { TrophyMark } from "@/components/brand/mark";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerDetails } from "@/components/cards/player-details";
import { Button } from "@/components/ui/button";
import { draftEligiblePlayers } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
import type { PlayerTournamentCard } from "@/types/game";
import styles from "./player-database.module.css";

const PAGE_SIZE = 50;

const ratingRanges = [
  "95-99",
  "90-94",
  "85-89",
  "80-84",
  "75-79",
  "70-74",
  "65-69",
];
const statusTiers = [
  "legend",
  "icon",
  "elite",
  "standout",
  "reliable",
  "role-player",
  "limited",
];
const eras = ["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inspected, setInspected] =
    useState<PlayerTournamentCard | null>(null);

  const identityCount = useMemo(
    () =>
      new Set(
        draftEligiblePlayers.map((player) => player.playerIdentityId),
      ).size,
    [],
  );

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
        first.playerName.localeCompare(second.playerName) ||
        second.tournamentYear - first.tournamentYear
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

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    if (!filtersOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [filtersOpen]);

  const clearAllFilters = () => {
    setNation("");
    setYear("");
    setPosition("");
    setRating("");
    setTier("");
    setEra("");
    setVisibleCount(PAGE_SIZE);
  };

  const activeFilters: Array<{
    key: string;
    label: string;
    clear: () => void;
  }> = [];
  if (nation) {
    const nationName = nations
      .find((entry) => entry.startsWith(`${nation}|`))
      ?.split("|")[1];
    activeFilters.push({
      key: "nation",
      label: nationName ?? nation,
      clear: () => updateFilter(setNation, ""),
    });
  }
  if (year) {
    activeFilters.push({
      key: "year",
      label: year,
      clear: () => updateFilter(setYear, ""),
    });
  }
  if (position) {
    activeFilters.push({
      key: "position",
      label: position,
      clear: () => updateFilter(setPosition, ""),
    });
  }
  if (rating) {
    activeFilters.push({
      key: "rating",
      label: `Rating ${rating}`,
      clear: () => updateFilter(setRating, ""),
    });
  }
  if (tier) {
    activeFilters.push({
      key: "tier",
      label: tier.replace("-", " "),
      clear: () => updateFilter(setTier, ""),
    });
  }
  if (era) {
    activeFilters.push({
      key: "era",
      label: era,
      clear: () => updateFilter(setEra, ""),
    });
  }

  return (
    <>
      <section className={styles.shell} aria-labelledby="database-title">
        <header className={styles.hero} data-testid="database-hero">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>THE COMPLETE CARD ARCHIVE</p>
            <h1 id="database-title" aria-label="Player Database">
              <span>Player</span>
              <strong>Database</strong>
            </h1>
          </div>

          <div className={styles.archiveVisual}>
            <div
              className={styles.metrics}
              aria-label="Archive totals"
              data-testid="archive-summary"
            >
              <div className={styles.metric}>
                <span>Cards</span>
                <strong>{draftEligiblePlayers.length}</strong>
                <small>Total tournament cards</small>
              </div>
              <div className={styles.metricMark} aria-hidden>
                <TrophyMark />
              </div>
              <div className={styles.metric}>
                <span>Identities</span>
                <strong>{identityCount}</strong>
                <small>Unique players</small>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.filters} data-testid="database-controls">
          <label className={styles.searchField}>
            <span>Search</span>
            <div>
              <Search size={18} aria-hidden />
              <input
                aria-label="Search player or nation"
                value={query}
                onChange={(event) =>
                  updateFilter(setQuery, event.target.value)
                }
                placeholder="Search player or nation"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateFilter(setQuery, "")}
                  aria-label="Clear player search"
                >
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
          </label>

          <div className={styles.desktopFilterFields}>
            <DatabaseSelect
              label="Nation"
              value={nation}
              onChange={(value) => updateFilter(setNation, value)}
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

            <DatabaseSelect
              label="Year"
              value={year}
              onChange={(value) => updateFilter(setYear, value)}
            >
              <option value="">All years</option>
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </DatabaseSelect>

            <DatabaseSelect
              label="Position"
              value={position}
              onChange={(value) => updateFilter(setPosition, value)}
            >
              <option value="">All positions</option>
              {positions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </DatabaseSelect>

            <DatabaseSelect
              label="Rating"
              value={rating}
              onChange={(value) => updateFilter(setRating, value)}
            >
              <option value="">All ratings</option>
              {ratingRanges.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </DatabaseSelect>

            <DatabaseSelect
              label="Tier"
              value={tier}
              onChange={(value) => updateFilter(setTier, value)}
            >
              <option value="">All tiers</option>
              {statusTiers.map((value) => (
                <option key={value} value={value}>
                  {value.replace("-", " ")}
                </option>
              ))}
            </DatabaseSelect>

            <DatabaseSelect
              label="Era"
              value={era}
              onChange={(value) => updateFilter(setEra, value)}
            >
              <option value="">All eras</option>
              {eras.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </DatabaseSelect>

            <DatabaseSelect
              label="Sort by"
              value={sort}
              onChange={(value) => {
                setSort(value as SortId);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <option value="rating">Rating</option>
              <option value="name">Name</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </DatabaseSelect>
          </div>

          <div className={styles.mobileControlRow}>
            <button
              type="button"
              className={styles.filterToggle}
              data-testid="mobile-filter-toggle"
              aria-expanded={filtersOpen}
              aria-controls="mobile-database-filters"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={15} aria-hidden />
              Filters
              {activeFilters.length > 0 && (
                <b aria-label={`${activeFilters.length} active filters`}>
                  {activeFilters.length}
                </b>
              )}
            </button>
            <DatabaseSelect
              label="Sort by"
              value={sort}
              valuePrefix="Sort:"
              className={styles.mobileSort}
              onChange={(value) => {
                setSort(value as SortId);
                setVisibleCount(PAGE_SIZE);
              }}
            >
              <option value="rating">Rating</option>
              <option value="name">Name</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </DatabaseSelect>
          </div>

          {activeFilters.length > 0 && (
            <div className={styles.activeChips} aria-label="Active filters">
              {activeFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  onClick={filter.clear}
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <span>{filter.label}</span>
                  <X size={12} aria-hidden />
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={styles.resultsHeading}
          role="status"
          aria-live="polite"
          data-testid="database-results-heading"
        >
          <span>
            <Grid3X3 size={15} aria-hidden /> {filtered.length} cards found
          </span>
          <small>
            Showing {Math.min(visible.length, filtered.length)} of {filtered.length}
          </small>
        </div>

        <div className={styles.grid} data-testid="database-grid">
          {visible.map((player) => (
            <button
              type="button"
              className={styles.card}
              data-tier={player.statusTier}
              data-testid="database-card"
              key={player.id}
              onClick={() => setInspected(player)}
              aria-label={`View ${player.playerName} ${player.tournamentYear}, rated ${player.overall}`}
            >
              <span className={styles.ratingBlock}>
                <small>{player.primaryPosition}</small>
                <strong>{player.overall}</strong>
                <span>OVR</span>
              </span>

              <span className={styles.portraitStage}>
                <CircularPortrait
                  imageId={player.imageId}
                  subjectName={player.playerName}
                  era={player.era}
                  statusTier={player.statusTier}
                  countryCode={player.countryCode}
                  tournamentYear={player.tournamentYear}
                  size="standard"
                />
              </span>

              <span className={styles.identity}>
                <h2 title={player.playerName}>{player.playerName}</h2>
                <span>
                  <i aria-hidden>{flagForCountry(player.countryCode)}</i>
                  {player.countryName}
                </span>
              </span>

              <span className={styles.cardFooter}>
                <span>{player.tournamentYear}</span>
                <i aria-hidden>•</i>
                <span>{player.statusTier.replace("-", " ")}</span>
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <p className={styles.empty}>No tournament cards match these filters.</p>
        )}

        {visibleCount < filtered.length && (
          <div className={styles.loadMore}>
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

      {filtersOpen && (
        <div
          className={styles.filterBackdrop}
          role="presentation"
          onMouseDown={() => setFiltersOpen(false)}
        >
          <section
            id="mobile-database-filters"
            className={styles.filterSheet}
            data-testid="mobile-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className={styles.filterSheetHeader}>
              <div>
                <span>THE CARD ARCHIVE</span>
                <h2 id="mobile-filter-title">Filter players</h2>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filter panel"
                autoFocus
              >
                <X size={18} aria-hidden />
              </button>
            </header>

            <div className={styles.filterSheetFields}>
              <DatabaseSelect
                label="Nation"
                value={nation}
                onChange={(value) => updateFilter(setNation, value)}
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

              <DatabaseSelect
                label="Year"
                value={year}
                onChange={(value) => updateFilter(setYear, value)}
              >
                <option value="">All years</option>
                {years.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </DatabaseSelect>

              <DatabaseSelect
                label="Position"
                value={position}
                onChange={(value) => updateFilter(setPosition, value)}
              >
                <option value="">All positions</option>
                {positions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </DatabaseSelect>

              <DatabaseSelect
                label="Era"
                value={era}
                onChange={(value) => updateFilter(setEra, value)}
              >
                <option value="">All eras</option>
                {eras.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </DatabaseSelect>

              <DatabaseSelect
                label="Rating"
                value={rating}
                onChange={(value) => updateFilter(setRating, value)}
              >
                <option value="">All ratings</option>
                {ratingRanges.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </DatabaseSelect>

              <DatabaseSelect
                label="Tier"
                value={tier}
                onChange={(value) => updateFilter(setTier, value)}
              >
                <option value="">All tiers</option>
                {statusTiers.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("-", " ")}
                  </option>
                ))}
              </DatabaseSelect>
            </div>

            <footer className={styles.filterSheetActions}>
              <Button onClick={() => setFiltersOpen(false)}>
                Apply filters
              </Button>
              <button type="button" onClick={clearAllFilters}>
                Clear all
              </button>
            </footer>
          </section>
        </div>
      )}

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
  className,
  valuePrefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  valuePrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child)) {
      return [];
    }

    const optionLabel = Children.toArray(child.props.children).join("");
    const optionValue =
      child.props.value === undefined || child.props.value === null
        ? optionLabel
        : String(child.props.value);

    return [{ label: optionLabel, value: optionValue }];
  });

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      const optionButtons = rootRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="option"]',
      );
      const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value),
      );
      optionButtons?.[selectedIndex]?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, options, value]);

  const moveOptionFocus = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    direction: 1 | -1,
  ) => {
    event.preventDefault();
    const optionButtons = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
        [],
    );
    const currentIndex = optionButtons.indexOf(event.currentTarget);
    const nextIndex =
      (currentIndex + direction + optionButtons.length) % optionButtons.length;
    optionButtons[nextIndex]?.focus();
  };

  return (
    <div
      className={`${styles.selectField}${className ? ` ${className}` : ""}`}
      ref={rootRef}
    >
      <span id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.selectTrigger}
        aria-labelledby={labelId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>
          {valuePrefix ? `${valuePrefix} ` : ""}
          {selected?.label ?? label}
        </span>
        <ChevronDown size={16} aria-hidden />
      </button>

      {open && (
        <div
          id={listboxId}
          className={styles.selectMenu}
          role="listbox"
          aria-labelledby={labelId}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={styles.selectOption}
                data-selected={isSelected || undefined}
                key={`${label}-${option.value}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    moveOptionFocus(event, 1);
                  } else if (event.key === "ArrowUp") {
                    moveOptionFocus(event, -1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    rootRef.current
                      ?.querySelector<HTMLButtonElement>('[role="option"]')
                      ?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    const optionButtons = rootRef.current?.querySelectorAll<HTMLButtonElement>(
                      '[role="option"]',
                    );
                    optionButtons?.[optionButtons.length - 1]?.focus();
                  }
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
