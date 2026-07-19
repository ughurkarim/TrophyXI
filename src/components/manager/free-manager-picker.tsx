"use client";

import { ArrowRight, Check, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
import type {
  DraftEraId,
  ManagerTournamentCard,
} from "@/types/game";
import styles from "./free-manager-picker.module.css";

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
  const [query, setQuery] = useState("");
  const era = getDraftEra(eraId);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleManagers = useMemo(
    () =>
      normalizedQuery
        ? managers.filter((manager) =>
            [
              manager.managerName,
              manager.teamName,
              manager.countryName,
              manager.tournamentYear,
              manager.style,
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(normalizedQuery),
          )
        : managers,
    [managers, normalizedQuery],
  );
  const selectedManager = selectedManagerId
    ? managers.find((manager) => manager.id === selectedManagerId)
    : undefined;

  return (
    <section
      className={styles.picker}
      aria-labelledby="free-manager-title"
      data-testid="free-manager-picker"
    >
      <div className={styles.intro}>
        <div>
          <p className="eyebrow eyebrow--gold">
            FREE SELECTION / MANAGER
          </p>
          <h1 id="free-manager-title">Pick your manager.</h1>
        </div>
        <p>
          Search the full active archive, compare Era Fit, then confirm one
          manager.
        </p>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} aria-hidden />
          <span className="sr-only">Search managers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, nation, team, year, or style"
          />
        </label>
        <span className={styles.resultCount} aria-live="polite">
          {visibleManagers.length} of {managers.length} managers · {era.label}
          {managerLocked ? " · Selection locked" : ""}
        </span>
      </div>

      <div
        className={styles.archive}
        aria-label="Available managers"
        data-testid="free-manager-archive"
      >
        {visibleManagers.map((manager) => {
          const selected = manager.id === selectedManagerId;
          const eraFit = calculateManagerEraFit(manager, eraId).score;
          return (
            <article
              key={manager.id}
              className={`${styles.managerOption}${
                selected ? ` ${styles.selected}` : ""
              }`}
            >
              <button
                type="button"
                className={styles.pick}
                aria-pressed={selected}
                disabled={managerLocked}
                aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}, Era Fit ${eraFit}`}
                onClick={() => onSelect(manager.id)}
              >
                <CircularPortrait
                  imageId={manager.imageId}
                  subjectName={manager.managerName}
                  era={manager.era}
                  countryCode={manager.countryCode}
                  tournamentYear={manager.tournamentYear}
                  size="compact"
                />
                <span className={styles.identity}>
                  <strong>{manager.managerName}</strong>
                  <small>
                    {flagForCountry(manager.countryCode)} {manager.teamName} ·{" "}
                    {manager.tournamentYear}
                  </small>
                  <i>{manager.style} tactics</i>
                </span>
                <span className={styles.eraFit}>
                  <small>ERA FIT</small>
                  <b>{eraFit}</b>
                </span>
                {selected && (
                  <span className={styles.check} aria-hidden>
                    <Check size={13} />
                  </span>
                )}
              </button>
              <button
                type="button"
                className={styles.inspect}
                aria-label={`View manager record for ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`}
                onClick={(event) =>
                  onInspect(manager.id, event.currentTarget)
                }
              >
                <Eye size={14} aria-hidden />
              </button>
            </article>
          );
        })}
        {visibleManagers.length === 0 && (
          <div className={styles.empty} role="status">
            No active managers match “{query.trim()}”.
          </div>
        )}
      </div>

      <div className={styles.confirm} aria-live="polite">
        <div>
          <span>Selected Manager</span>
          <strong>
            {selectedManager?.managerName ?? "Choose from the archive"}
          </strong>
          <small>
            {managerLocked
              ? "Selection locked · Continue to your formation."
              : selectedManager
              ? `${selectedManager.teamName} ${selectedManager.tournamentYear} · ${selectedManager.style}`
              : "Your choice remains editable until you confirm."}
          </small>
        </div>
        <Button
          className={styles.continue}
          disabled={!selectedManager}
          onClick={onContinue}
        >
          {managerLocked ? "CONTINUE TO FORMATION" : "CONFIRM MANAGER"}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
