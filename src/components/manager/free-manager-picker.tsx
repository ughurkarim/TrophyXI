"use client";

import { ArrowRight, Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { flagForCountry } from "@/lib/utils";
import type { DraftEraId, ManagerTournamentCard } from "@/types/game";
import styles from "./free-manager-picker.module.css";

type SortMode = "quality" | "era-fit" | "name" | "year";

export const managerQualityScore = (manager: ManagerTournamentCard) =>
  Math.round(
    (manager.grades.offense + manager.grades.defense + manager.leadership + manager.gameManagement) / 4,
  );

const qualityOrder = (first: ManagerTournamentCard, second: ManagerTournamentCard) =>
  managerQualityScore(second) - managerQualityScore(first) ||
  second.leadership - first.leadership ||
  second.gameManagement - first.gameManagement ||
  first.managerName.localeCompare(second.managerName);

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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const permanentRanking = useMemo(
    () => [...managers].sort(qualityOrder),
    [managers],
  );
  const ranks = useMemo(
    () => new Map(permanentRanking.map((manager, index) => [manager.id, index + 1])),
    [permanentRanking],
  );
  const visibleManagers = useMemo(() => {
    const filtered = managers.filter((manager) =>
      (!normalizedQuery || [manager.managerName, manager.teamName, manager.countryName, manager.tournamentYear, manager.style].join(" ").toLocaleLowerCase().includes(normalizedQuery)) &&
      (!nation || manager.countryCode === nation) &&
      (!managerEra || manager.era === managerEra) &&
      (!style || manager.style === style) &&
      (!preferredFormation || manager.preferredFormations.includes(preferredFormation as never)),
    );
    return filtered.sort((first, second) => {
      if (sort === "era-fit") return calculateManagerEraFit(second, eraId).score - calculateManagerEraFit(first, eraId).score || qualityOrder(first, second);
      if (sort === "name") return first.managerName.localeCompare(second.managerName) || second.tournamentYear - first.tournamentYear;
      if (sort === "year") return second.tournamentYear - first.tournamentYear || qualityOrder(first, second);
      return qualityOrder(first, second);
    });
  }, [eraId, managerEra, managers, nation, normalizedQuery, preferredFormation, sort, style]);
  const selectedManager = selectedManagerId
    ? managers.find((manager) => manager.id === selectedManagerId)
    : undefined;
  const nationOptions = [...new Map(managers.map((manager) => [manager.countryCode, manager.countryName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const formationOptions = [...new Set(managers.flatMap((manager) => manager.preferredFormations))].sort();

  return (
    <section className={styles.picker} aria-labelledby="free-manager-title" data-testid="free-manager-picker">
      <div className={styles.intro}>
        <div><p className="eyebrow eyebrow--gold">FREE SELECTION / MANAGER POOL</p><h1 id="free-manager-title">Choose who leads your XI.</h1></div>
        <p>Search every available manager, compare their tactical profile, and choose who will lead your XI.</p>
      </div>

      <div className={styles.controls} aria-label="Manager pool controls">
        <label className={styles.search}><Search size={15} aria-hidden /><span className="sr-only">Search managers</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search manager, nation, team…" /></label>
        <select aria-label="Manager nation" value={nation} onChange={(event) => setNation(event.target.value)}><option value="">All nations</option>{nationOptions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
        <select aria-label="Manager era" value={managerEra} onChange={(event) => setManagerEra(event.target.value)}><option value="">All eras</option>{["1970s","1980s","1990s","2000s","2010s","2020s"].map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Tactical style" value={style} onChange={(event) => setStyle(event.target.value)}><option value="">All styles</option>{[...new Set(managers.map((manager) => manager.style))].sort().map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Preferred formation" value={preferredFormation} onChange={(event) => setPreferredFormation(event.target.value)}><option value="">All formations</option>{formationOptions.map((value) => <option key={value}>{value.replaceAll("-", "–")}</option>)}</select>
        <select aria-label="Sort managers" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="quality">Rank: best overall</option>{eraId !== "all" && <option value="era-fit">Era Fit</option>}<option value="name">Name</option><option value="year">Tournament year</option></select>
      </div>

      {selectedManager && (
        <aside className={styles.preview} aria-label={`Selected manager preview: ${selectedManager.managerName}`}>
          <CircularPortrait imageId={selectedManager.imageId} subjectName={selectedManager.managerName} era={selectedManager.era} countryCode={selectedManager.countryCode} tournamentYear={selectedManager.tournamentYear} size="compact" />
          <div className={styles.previewIdentity}><span>SELECTED MANAGER</span><strong>{selectedManager.managerName}</strong><small>{selectedManager.tacticalIdentity}</small></div>
          <dl>{[["OFF",selectedManager.grades.offense],["DEF",selectedManager.grades.defense],["LEADERSHIP",selectedManager.leadership],["GAME MGMT",selectedManager.gameManagement]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}{eraId !== "all" && <div><dt>ERA FIT</dt><dd>{calculateManagerEraFit(selectedManager, eraId).score}</dd></div>}</dl>
          <p><span>Preferred</span>{selectedManager.preferredFormations.map((formation) => formation.replaceAll("-", "–")).join(" · ")}</p>
        </aside>
      )}

      <div className={styles.poolHeader}><span>{visibleManagers.length} OF {managers.length} MANAGERS · {era.label}</span><small>PERMANENT RANK USES OFF · DEF · LEADERSHIP · GAME MANAGEMENT</small></div>
      <div className={styles.pool} aria-label="Available managers" data-testid="free-manager-pool" data-legacy-testid="free-manager-archive">
        {visibleManagers.map((manager) => {
          const selected = manager.id === selectedManagerId;
          const eraFit = calculateManagerEraFit(manager, eraId).score;
          return (
            <article key={manager.id} className={`${styles.managerOption} ${styles[`style_${manager.style}`]}${selected ? ` ${styles.selected}` : ""}`}>
              <button type="button" className={styles.pick} aria-pressed={selected} aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}${eraId === "all" ? "" : `, Era Fit ${eraFit}`}`} onClick={() => onSelect(manager.id)}>
                <span className={styles.rank}>#{ranks.get(manager.id)}</span>
                <CircularPortrait imageId={manager.imageId} subjectName={manager.managerName} era={manager.era} countryCode={manager.countryCode} tournamentYear={manager.tournamentYear} size="compact" />
                <span className={styles.identity}><strong>{manager.managerName}</strong><small>{flagForCountry(manager.countryCode)} {manager.countryName} · {manager.tournamentYear}</small><i>{manager.style} tactics</i><em>{manager.preferredFormations.map((formation) => formation.replaceAll("-", "–")).join(" · ")}</em></span>
                {eraId !== "all" && <span className={styles.eraFit}><small>ERA FIT</small><b>{eraFit}</b></span>}
                {selected && <span className={styles.check} aria-hidden><Check size={13} /></span>}
              </button>
              <button type="button" className={styles.inspect} aria-label={`View profile for ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`} onClick={(event) => onInspect(manager.id, event.currentTarget)}>VIEW PROFILE</button>
            </article>
          );
        })}
        {visibleManagers.length === 0 && <div className={styles.empty} role="status">No managers match the current pool filters.</div>}
      </div>

      <div className={styles.confirm} aria-live="polite"><div><span>Selected Manager</span><strong>{selectedManager?.managerName ?? "Choose from the manager pool"}</strong><small>{selectedManager ? `${selectedManager.teamName} ${selectedManager.tournamentYear} · ${selectedManager.style}` : "Your choice remains editable until you confirm."}</small></div><Button className={styles.continue} disabled={!selectedManager} onClick={onContinue}>CONFIRM MANAGER <ArrowRight size={16} aria-hidden /></Button></div>
    </section>
  );
}
