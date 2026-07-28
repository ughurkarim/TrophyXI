"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  Crown,
  Scale,
  Search,
  Shield,
  Target,
  Waves,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
import type { DraftEraId, ManagerTournamentCard } from "@/types/game";
import styles from "./free-manager-picker.module.css";

type SortMode = "quality" | "era-fit" | "name" | "year";

type SelectOption = {
  value: string;
  label: string;
};

function CustomSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.customSelect} ref={rootRef}>
      <button
        type="button"
        className={`${styles.customSelectTrigger}${open ? ` ${styles.customSelectOpen}` : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <div className={styles.customSelectMenu} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.customSelectOption}${isSelected ? ` ${styles.customSelectOptionSelected}` : ""}`}
                key={option.value || `all-${option.label}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={13} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


export const managerQualityScore = (manager: ManagerTournamentCard) =>
  Math.round(
    (manager.grades.offense +
      manager.grades.defense +
      manager.leadership +
      manager.gameManagement) /
      4,
  );

const qualityOrder = (
  first: ManagerTournamentCard,
  second: ManagerTournamentCard,
) =>
  managerQualityScore(second) - managerQualityScore(first) ||
  second.leadership - first.leadership ||
  second.gameManagement - first.gameManagement ||
  first.managerName.localeCompare(second.managerName);

function TacticalIcon({ style, size = 13 }: { style: string; size?: number }) {
  const normalized = style.toLocaleLowerCase();

  if (normalized === "pressing") return <Zap size={size} aria-hidden />;
  if (normalized === "counter") return <ArrowRight size={size} aria-hidden />;
  if (normalized === "defensive") return <Shield size={size} aria-hidden />;
  if (normalized === "direct") return <Target size={size} aria-hidden />;
  if (normalized === "fluid") return <Waves size={size} aria-hidden />;
  if (normalized === "possession") return <CircleDot size={size} aria-hidden />;
  return <Scale size={size} aria-hidden />;
}

export function FreeManagerPicker({
  managers,
  eraId,
  selectedManagerId,
  managerLocked = false,
  onSelect,
  onInspect,
  onContinue,
}: {
  managers: ManagerTournamentCard[];
  eraId: DraftEraId;
  selectedManagerId: string | null;
  managerLocked?: boolean;
  onSelect: (managerId: string) => void;
  onInspect: (managerId: string, returnFocus: HTMLElement) => void;
  onContinue: () => void;
}) {
  void managerLocked;

  const [query, setQuery] = useState("");
  const [nation, setNation] = useState("");
  const [managerEra, setManagerEra] = useState("");
  const [style, setStyle] = useState("");
  const [preferredFormation, setPreferredFormation] = useState("");
  const [sort, setSort] = useState<SortMode>("quality");

  const era = getDraftEra(eraId);
  const isNeutralEra = eraId === "all";
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const permanentRanking = useMemo(
    () => [...managers].sort(qualityOrder),
    [managers],
  );

  const ranks = useMemo(
    () =>
      new Map(
        permanentRanking.map((manager, index) => [manager.id, index + 1]),
      ),
    [permanentRanking],
  );

  const visibleManagers = useMemo(() => {
    const filtered = managers.filter(
      (manager) =>
        (!normalizedQuery ||
          [
            manager.managerName,
            manager.teamName,
            manager.countryName,
            manager.tournamentYear,
            manager.style,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedQuery)) &&
        (!nation || manager.countryCode === nation) &&
        (!managerEra || manager.era === managerEra) &&
        (!style || manager.style === style) &&
        (!preferredFormation ||
          manager.preferredFormations.includes(preferredFormation as never)),
    );

    return filtered.sort((first, second) => {
      if (sort === "era-fit" && !isNeutralEra) {
        return (
          calculateManagerEraFit(second, eraId).score -
            calculateManagerEraFit(first, eraId).score ||
          qualityOrder(first, second)
        );
      }
      if (sort === "name") {
        return (
          first.managerName.localeCompare(second.managerName) ||
          second.tournamentYear - first.tournamentYear
        );
      }
      if (sort === "year") {
        return (
          second.tournamentYear - first.tournamentYear ||
          qualityOrder(first, second)
        );
      }
      return qualityOrder(first, second);
    });
  }, [
    eraId,
    isNeutralEra,
    managerEra,
    managers,
    nation,
    normalizedQuery,
    preferredFormation,
    sort,
    style,
  ]);

  const selectedManager = selectedManagerId
    ? managers.find((manager) => manager.id === selectedManagerId)
    : undefined;

  const nationOptions = [
    ...new Map(
      managers.map((manager) => [manager.countryCode, manager.countryName]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const formationOptions = [
    ...new Set(managers.flatMap((manager) => manager.preferredFormations)),
  ].sort();

  return (
    <section
      className={styles.picker}
      aria-labelledby="free-manager-title"
      data-testid="free-manager-picker"
    >
      <div className={styles.intro}>
        <div>
          <p className="eyebrow eyebrow--gold">FREE SELECTION / MANAGER POOL</p>
          <h1 id="free-manager-title">Choose who leads your XI.</h1>
        </div>
        <p>
          Search every available manager, compare their tactical profile, and
          choose who will lead your XI.
        </p>
      </div>

      <div className={styles.controls} aria-label="Manager pool controls">
        <label className={styles.search}>
          <Search size={17} aria-hidden />
          <span className="sr-only">Search managers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search manager, nation, team…"
          />
        </label>

        <CustomSelect
          ariaLabel="Manager nation"
          value={nation}
          onChange={setNation}
          options={[
            { value: "", label: "All nations" },
            ...nationOptions.map(([code, name]) => ({ value: code, label: name })),
          ]}
        />

        <CustomSelect
          ariaLabel="Manager era"
          value={managerEra}
          onChange={setManagerEra}
          options={[
            { value: "", label: "All eras" },
            ...["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"].map((value) => ({ value, label: value })),
          ]}
        />

        <CustomSelect
          ariaLabel="Tactical style"
          value={style}
          onChange={setStyle}
          options={[
            { value: "", label: "All styles" },
            ...[...new Set(managers.map((manager) => manager.style))]
              .sort()
              .map((value) => ({ value, label: value })),
          ]}
        />

        <CustomSelect
          ariaLabel="Preferred formation"
          value={preferredFormation}
          onChange={setPreferredFormation}
          options={[
            { value: "", label: "All formations" },
            ...formationOptions.map((value) => ({
              value,
              label: value.replaceAll("-", "–"),
            })),
          ]}
        />

        <CustomSelect
          ariaLabel="Sort managers"
          value={sort}
          onChange={(value) => setSort(value as SortMode)}
          options={[
            { value: "quality", label: "Rank: best overall" },
            ...(!isNeutralEra ? [{ value: "era-fit", label: "Era Fit" }] : []),
            { value: "name", label: "Name" },
            { value: "year", label: "Tournament year" },
          ]}
        />
      </div>

      <aside
        className={`${styles.preview}${
          selectedManager ? "" : ` ${styles.previewEmpty}`
        }`}
        aria-label={
          selectedManager
            ? `Selected manager preview: ${selectedManager.managerName}`
            : "Selected manager preview"
        }
      >
        <div className={styles.previewPortraitStage}>
          {selectedManager ? (
            <>
              <span className={styles.previewCrown} aria-hidden>
                <Crown size={16} />
              </span>
              <CircularPortrait
                imageId={selectedManager.imageId}
                subjectName={selectedManager.managerName}
                era={selectedManager.era}
                countryCode={selectedManager.countryCode}
                tournamentYear={selectedManager.tournamentYear}
                size="compact"
              />
            </>
          ) : (
            <>
              <span className={styles.previewCrown} aria-hidden>
                <Crown size={16} />
              </span>
              <div className={styles.previewPlaceholderPortrait} aria-hidden>
                <span />
              </div>
            </>
          )}
        </div>

        {selectedManager ? (
          <>
            <div className={styles.previewIdentity}>
              <span>SELECTED MANAGER</span>
              <strong>{selectedManager.managerName}</strong>
              <small>
                {flagForCountry(selectedManager.countryCode)}{" "}
                {selectedManager.countryName} · {selectedManager.tournamentYear}
                {" · "}
                {selectedManager.tacticalIdentity}
              </small>
            </div>

            <dl
              className={
                isNeutralEra ? styles.previewMetricsNeutral : undefined
              }
            >
              {[
                ["OFF", selectedManager.grades.offense],
                ["DEF", selectedManager.grades.defense],
                ["LEADERSHIP", selectedManager.leadership],
                ["GAME MGMT", selectedManager.gameManagement],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {!isNeutralEra && (
                <div>
                  <dt>ERA FIT</dt>
                  <dd>{calculateManagerEraFit(selectedManager, eraId).score}</dd>
                </div>
              )}
            </dl>

            <p className={styles.preferred}>
              <span>Preferred</span>
              {selectedManager.preferredFormations
                .map((formation) => formation.replaceAll("-", "–"))
                .join(" · ")}
            </p>
          </>
        ) : (
          <>
            <div className={styles.previewIdentity}>
              <span>SELECTED MANAGER</span>
              <strong className={styles.emptyTitle}>No manager selected</strong>
              <small>Choose a manager below to preview their tactical profile.</small>
            </div>

            <dl
              className={
                isNeutralEra ? styles.previewMetricsNeutral : undefined
              }
              aria-hidden
            >
              {[
                "OFF",
                "DEF",
                "LEADERSHIP",
                "GAME MGMT",
                ...(!isNeutralEra ? ["ERA FIT"] : []),
              ].map((label) => (
                <div key={label} className={styles.emptyMetric}>
                  <dt>{label}</dt>
                  <dd>—</dd>
                </div>
              ))}
            </dl>

            <p className={`${styles.preferred} ${styles.emptyPreferred}`} aria-hidden>
              <span>Preferred</span>—
            </p>
          </>
        )}
      </aside>

      <div className={styles.poolHeader}>
        <span>
          {visibleManagers.length} OF {managers.length} MANAGERS · {era.label}
        </span>
        <small>
          PERMANENT RANK USES OFF · DEF · LEADERSHIP · GAME MANAGEMENT
        </small>
      </div>

      <div
        className={styles.pool}
        aria-label="Available managers"
        data-testid="free-manager-pool"
        data-legacy-testid="free-manager-archive"
      >
        {visibleManagers.map((manager) => {
          const selected = manager.id === selectedManagerId;
          const eraFit = isNeutralEra
            ? null
            : calculateManagerEraFit(manager, eraId).score;

          return (
            <article
              key={manager.id}
              className={`${styles.managerOption} ${
                styles[`style_${manager.style}`]
              }${selected ? ` ${styles.selected}` : ""}`}
            >
              <button
                type="button"
                className={`${styles.pick}${
                  isNeutralEra ? ` ${styles.pickNeutral}` : ""
                }`}
                aria-pressed={selected}
                aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${
                  manager.tournamentYear
                }${eraFit === null ? "" : `, Era Fit ${eraFit}`}`}
                onClick={() => onSelect(manager.id)}
              >
                <span className={styles.rank}>#{ranks.get(manager.id)}</span>

                <span className={styles.portraitStage}>
                  <CircularPortrait
                    imageId={manager.imageId}
                    subjectName={manager.managerName}
                    era={manager.era}
                    countryCode={manager.countryCode}
                    tournamentYear={manager.tournamentYear}
                    size="compact"
                  />
                </span>

                <span className={styles.identity}>
                  <strong>{manager.managerName}</strong>
                  <small>
                    {flagForCountry(manager.countryCode)} {manager.countryName} ·{" "}
                    {manager.tournamentYear}
                  </small>
                  <i className={styles.tacticalBadge}>
                    <TacticalIcon style={manager.style} size={12} />
                    <span>{manager.style} tactics</span>
                  </i>
                  <em>
                    {manager.preferredFormations
                      .map((formation) => formation.replaceAll("-", "–"))
                      .join(" · ")}
                  </em>
                </span>

                {eraFit !== null && (
                  <span className={styles.eraFit}>
                    <small>ERA FIT</small>
                    <b>{eraFit}</b>
                  </span>
                )}

                {selected && (
                  <span className={styles.check} aria-hidden>
                    <Check size={14} />
                  </span>
                )}
              </button>

              <button
                type="button"
                className={styles.inspect}
                aria-label={`View profile for ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`}
                onClick={(event) =>
                  onInspect(manager.id, event.currentTarget)
                }
              >
                VIEW PROFILE
              </button>
            </article>
          );
        })}

        {visibleManagers.length === 0 && (
          <div className={styles.empty} role="status">
            No managers match the current pool filters.
          </div>
        )}
      </div>

      <div
        className={`${styles.confirm}${
          selectedManager ? "" : ` ${styles.confirmEmpty}`
        }`}
        aria-live="polite"
      >
        <div className={styles.confirmIdentity}>
          <span>Selected Manager</span>
          {selectedManager ? (
            <>
              <strong>{selectedManager.managerName}</strong>
              <small>
                {flagForCountry(selectedManager.countryCode)}{" "}
                {selectedManager.teamName} {selectedManager.tournamentYear} ·{" "}
                {selectedManager.style}
              </small>
            </>
          ) : (
            <>
              <strong className={styles.emptyConfirmTitle}>None selected</strong>
              <small>Select a manager from the pool to continue.</small>
            </>
          )}
        </div>

        <Button
          className={styles.continue}
          disabled={!selectedManager}
          onClick={onContinue}
        >
          CONFIRM MANAGER <ArrowRight size={18} aria-hidden />
        </Button>
      </div>
    </section>
  );
}