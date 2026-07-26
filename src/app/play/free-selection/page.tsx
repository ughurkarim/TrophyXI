"use client";

import { Dices, Eye, Move, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerDetails } from "@/components/cards/player-details";
import { OpponentSelection } from "@/components/draft/opponent-selection";
import { TeamRatings } from "@/components/draft/team-ratings";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import { calculateEraFitDetails, getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { draftEligiblePlayers, playersById } from "@/data/players";
import { getPositionFit } from "@/engine/draft";
import { calculateTeamRatings } from "@/engine/ratings";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type { BenchSlotId, PlayerStatusTier, PlayerTournamentCard } from "@/types/game";
import styles from "./free-selection.module.css";

const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];
const tierOptions: PlayerStatusTier[] = ["legend", "icon", "elite", "standout", "reliable", "role-player", "limited"];

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

export default function FreeSelectionPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const gameMode = useGameStore((state) => state.gameMode);
  const eraId = useGameStore((state) => state.eraId);
  const managerId = useGameStore((state) => state.managerId);
  const formationId = useGameStore((state) => state.formationId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const draftPhase = useGameStore((state) => state.draftPhase);
  const selectedPlayerId = useGameStore((state) => state.selectedPlayerId);
  const fitPreviews = useGameStore((state) => state.projectedPositionFits);
  const selectPlayer = useGameStore((state) => state.selectPlayer);
  const placeSelectedPlayer = useGameStore((state) => state.placeSelectedPlayer);
  const assignFreeBenchPlayer = useGameStore((state) => state.assignFreeBenchPlayer);
  const removeFreePlayer = useGameStore((state) => state.removeFreePlayer);
  const randomizeFreeSquad = useGameStore((state) => state.randomizeFreeSquad);
  const finalizeFreeSelection = useGameStore((state) => state.finalizeFreeSelection);
  const editFreeSelection = useGameStore((state) => state.editFreeSelection);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [nation, setNation] = useState("");
  const [tier, setTier] = useState<PlayerStatusTier | "">("");
  const [minimumRating, setMinimumRating] = useState<number | "">("");
  const [viewAll, setViewAll] = useState(false);
  const [inspected, setInspected] = useState<PlayerTournamentCard | null>(null);
  const [filledTarget, setFilledTarget] = useState<{ targetId: string; player: PlayerTournamentCard } | null>(null);
  const [showSquad, setShowSquad] = useState(false);
  const [showRandomize, setShowRandomize] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (gameMode !== "free-selection") router.replace("/play");
    else if (!eraId) router.replace("/play/era");
    else if (!managerId) router.replace("/play/manager");
    else if (!formationId) router.replace("/play/formation");
  }, [eraId, formationId, gameMode, hydrated, managerId, router]);

  const formation = formationId ? getFormation(formationId) : null;
  const manager = managerId ? managersById.get(managerId) : undefined;
  const era = eraId ? getDraftEra(eraId) : null;
  const lineup = useMemo(() => picks.flatMap((pick) => {
    const player = playersById.get(pick.cardId);
    return player ? [player] : [];
  }), [picks]);
  const bench = useMemo(() => benchPicks.flatMap((pick) => {
    const player = playersById.get(pick.cardId);
    return player ? [player] : [];
  }), [benchPicks]);
  const ratings = useMemo(() => formation && manager && eraId
    ? calculateTeamRatings(lineup, formation, { picks, manager, eraId, bench })
    : null, [bench, eraId, formation, lineup, manager, picks]);
  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : undefined;
  const targetSlot = formation?.slots.find((slot) => slot.id === targetId);
  const targetBench = benchSlots.includes(targetId as BenchSlotId) ? targetId as BenchSlotId : null;
  const usedIdentityIds = useMemo(() => new Set([...lineup, ...bench].map((player) => player.playerIdentityId)), [bench, lineup]);

  const candidates = useMemo(() => {
    if (!formation || !manager || !eraId || !ratings || (!targetSlot && !targetBench)) return [];
    const normalizedQuery = normalizeSearchText(query.trim());
    const eligible = draftEligiblePlayers
      .filter((player) =>
        !usedIdentityIds.has(player.playerIdentityId) &&
        (!normalizedQuery ||
          normalizeSearchText(
            `${player.playerName} ${player.countryName} ${player.countryCode} ${player.tournamentYear}`,
          ).includes(normalizedQuery)) &&
        (!year || player.tournamentYear === year) &&
        (!nation || player.countryCode === nation) &&
        (!tier || player.statusTier === tier) &&
        (!minimumRating || player.overall >= minimumRating),
      )
      .map((player) => {
        const positionFit = targetSlot
          ? getPositionFit(player, targetSlot)
          : 0;
        return { player, positionFit };
      })
      .filter((candidate) => targetBench || candidate.positionFit >= 70);
    const impactPool = targetBench && !viewAll
      ? [...eligible]
          .sort(
            (first, second) =>
              second.player.overall - first.player.overall ||
              second.player.eligiblePositions.length - first.player.eligiblePositions.length,
          )
          .slice(0, 120)
      : eligible;
    return impactPool
      .map(({ player, positionFit }) => {
        const eraFit = eraId === "all" ? null : calculateEraFitDetails(player, eraId, { manager, formation }).fit;
        const projectedPicks = targetSlot ? [...picks, { slotId: targetSlot.id, cardId: player.id }] : picks;
        const projectedBench = targetBench ? [...bench, player] : bench;
        const projectedLineup = targetSlot ? [...lineup, player] : lineup;
        const projected = calculateTeamRatings(projectedLineup, formation, { picks: projectedPicks, manager, eraId, bench: projectedBench });
        const chemistryGain = projected.chemistry - ratings.chemistry;
        const overallGain = projected.overall - ratings.overall;
        const managerFitGain = projected.managerFit - ratings.managerFit;
        return {
          player,
          positionFit,
          eraFit,
          chemistryGain,
          overallGain,
          managerFitGain,
          projected,
        };
      })
      .sort((first, second) =>
        viewAll
          ? second.player.overall - first.player.overall ||
            second.positionFit - first.positionFit ||
            first.player.playerName.localeCompare(second.player.playerName)
          : second.projected.overall - first.projected.overall ||
            (second.projected.coreOverall ?? 0) - (first.projected.coreOverall ?? 0) ||
            (second.projected.legacyScore ?? 0) - (first.projected.legacyScore ?? 0) ||
            second.chemistryGain - first.chemistryGain ||
            second.positionFit - first.positionFit ||
            second.player.overall - first.player.overall ||
            first.player.playerName.localeCompare(second.player.playerName),
      );
  }, [bench, eraId, formation, lineup, manager, minimumRating, nation, picks, query, ratings, targetBench, targetSlot, tier, usedIdentityIds, viewAll, year]);

  if (!hydrated || gameMode !== "free-selection" || !eraId || !manager || !formation || !era || !ratings) {
    return <main className="game-page loading-state"><div className="loading-emblem" /><p className="eyebrow">OPENING FREE SELECTION</p></main>;
  }

  if (draftPhase === "opponent") {
    return <div className={`game-page game-page--stadium ${era.themeClass}`}><GameHeader step="OPPONENT / 05" /><SaveNotice /><main className="container game-main"><OpponentSelection eraId={eraId} onContinue={() => router.push("/match")} onEditSquad={editFreeSelection} /></main></div>;
  }

  const activePreview = targetSlot ? fitPreviews.find((preview) => preview.slotId === targetSlot.id) : undefined;
  const selectedCandidate = selectedPlayer
    ? candidates.find((candidate) => candidate.player.id === selectedPlayer.id)
    : undefined;
  const canPlaceSelected = Boolean(
    selectedPlayer &&
      selectedCandidate &&
      (targetBench || activePreview?.canPlace),
  );
  const canContinue = lineup.length === 11 && bench.length === 3;
  const needs = formation.slots.filter((slot) => !picks.some((pick) => pick.slotId === slot.id)).map((slot) => slot.label);
  const nationOptions = [...new Map(draftEligiblePlayers.map((player) => [player.countryCode, player.countryName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  const placePlayer = () => {
    if (!selectedPlayer) return;
    if (targetBench) assignFreeBenchPlayer(selectedPlayer.id, targetBench);
    else if (targetSlot && activePreview?.canPlace) placeSelectedPlayer(targetSlot.id);
    setTargetId(null);
    setFilledTarget(null);
  };

  const clearPickedPlayerForNewTarget = (nextTarget: string) => {
    if (nextTarget !== targetId && selectedPlayerId) {
      // selectPlayer toggles the currently selected card off.
      selectPlayer(selectedPlayerId);
    }
  };

  const selectTarget = (nextTarget: string) => {
    const isCurrentTarget = nextTarget === targetId;

    if (
      isCurrentTarget &&
      selectedPlayer &&
      ((targetBench && nextTarget === targetBench) ||
        (targetSlot?.id === nextTarget && activePreview?.canPlace))
    ) {
      placePlayer();
      return;
    }

    clearPickedPlayerForNewTarget(nextTarget);
    setTargetId(nextTarget);
    setFilledTarget(null);
    setQuery("");
    setViewAll(false);
  };

  const selectFilledTarget = (
    nextTarget: string,
    player: PlayerTournamentCard,
  ) => {
    clearPickedPlayerForNewTarget(nextTarget);
    setTargetId(nextTarget);
    setFilledTarget({ targetId: nextTarget, player });
    setQuery("");
    setViewAll(false);
  };

  return (
    <div className={`game-page game-page--stadium ${era.themeClass}`}>
      <GameHeader step="FREE SELECTION / 04" />
      <SaveNotice />
      <main className={`container ${styles.main}`}>
        <header className={styles.heading}>
          <div><p className="eyebrow eyebrow--gold">FREE SELECTION</p><h1>BUILD YOUR SQUAD</h1><p>Select a position, choose from the best tournament cards available, and complete your XI and bench.</p></div>
          <div className={styles.headingActions}><Button variant="ghost" onClick={() => setShowSquad(true)}>VIEW SQUAD</Button><Button variant="secondary" onClick={() => picks.length + benchPicks.length ? setShowRandomize(true) : randomizeFreeSquad()}><Dices size={15} aria-hidden /> RANDOMIZE SQUAD</Button></div>
        </header>

        <section className={styles.statusBar} aria-label="Squad status">
          <span>MANAGER <b>{manager.managerName}</b></span><span>STYLE <b>{manager.style}</b></span><span>FORMATION <b>{formation.name}</b></span><span>ERA <b>{era.label}</b></span><span>SQUAD <b>{lineup.length + bench.length}/14</b></span><span>STARTERS <b>{lineup.length}/11</b></span><span>BENCH <b>{bench.length}/3</b></span>
        </section>

        <section className={styles.workspace} aria-label="Squad building workspace">
          <section className={styles.pitchPanel}>
            <div className={styles.pitchAura}>
              <TacticalPitch formation={formation} lineup={lineup} picks={picks} fitPreviews={selectedPlayer ? fitPreviews : []} activeSlotId={targetSlot?.id} selectedSlotId={targetSlot?.id} goalkeeperYCap={86} onSelectSlot={selectTarget} onSelectFilledSlot={selectFilledTarget} />
            </div>
            <div className={styles.benchSlots} aria-label="Bench slots">
              {benchSlots.map((slotId, index) => {
                const pick = benchPicks.find((candidate) => candidate.slotId === slotId);
                const player = pick ? playersById.get(pick.cardId) : undefined;
                return <button type="button" key={slotId} className={[targetId === slotId ? styles.activeBench : "", !player ? styles.emptyBench : ""].filter(Boolean).join(" ")} onClick={() => player ? selectFilledTarget(slotId, player) : selectTarget(slotId)}><span className={styles.benchNumber}>B{index + 1}</span>{player ? <><CircularPortrait imageId={player.imageId} subjectName={player.playerName} era={player.era} statusTier={player.statusTier} countryCode={player.countryCode} tournamentYear={player.tournamentYear} size="compact" /><span className={styles.benchIdentity} title={`${player.playerName} · ${player.overall} · ${player.tournamentYear}`}><b>{player.playerName.split(" ").at(-1)}</b><small>{player.primaryPosition} · {player.overall} OVR · {player.tournamentYear}</small></span></> : <span className={styles.benchIdentity}><b>OPEN BENCH</b><small>SELECT ANY PLAYER</small></span>}</button>;
              })}
            </div>
            {lineup.length >= 4 ? <TeamRatings ratings={ratings} /> : <p className={styles.ratingsPending}>TEAM RATINGS ACTIVATE AFTER FOUR STARTERS</p>}
          </section>

          <aside className={styles.playerPanel}>
            {!targetSlot && !targetBench ? (
              <div className={styles.emptyState}><span className="eyebrow eyebrow--gold">POSITION FIRST</span><h2>Select a position on the pitch.</h2><p>The strongest available tournament cards will appear automatically.</p><div><b>{needs.length} starter roles remain</b><span>{needs.slice(0, 8).join(" · ")}{needs.length > 8 ? "…" : ""}</span><b>{3 - bench.length} bench places remain</b></div></div>
            ) : filledTarget ? (
              <div className={styles.filledActions}><span className="eyebrow eyebrow--gold">FILLED POSITION · {targetSlot?.label ?? targetBench?.toLocaleUpperCase()}</span><CircularPortrait imageId={filledTarget.player.imageId} subjectName={filledTarget.player.playerName} era={filledTarget.player.era} statusTier={filledTarget.player.statusTier} countryCode={filledTarget.player.countryCode} tournamentYear={filledTarget.player.tournamentYear} size="standard" /><h2>{filledTarget.player.playerName}</h2><p>{flagForCountry(filledTarget.player.countryCode)} {filledTarget.player.countryName} · {filledTarget.player.tournamentYear} · {filledTarget.player.overall} OVR</p><div><Button variant="secondary" onClick={() => setInspected(filledTarget.player)}><Eye size={14} aria-hidden /> INSPECT</Button><Button variant="secondary" onClick={() => { removeFreePlayer(filledTarget.player.id); setFilledTarget(null); }}>REPLACE</Button><Button variant="secondary" onClick={() => { const player = filledTarget.player; removeFreePlayer(player.id); selectPlayer(player.id); setTargetId(null); setFilledTarget(null); }}><Move size={14} aria-hidden /> MOVE</Button><Button variant="ghost" onClick={() => { removeFreePlayer(filledTarget.player.id); setTargetId(null); setFilledTarget(null); }}><Trash2 size={14} aria-hidden /> REMOVE</Button></div></div>
            ) : (
              <>
                <div className={styles.panelHeading}>
                  <div className={styles.positionLockup}>
                    <span className={styles.positionBadge}>{targetSlot?.label ?? targetBench?.toLocaleUpperCase()}</span>
                    <div>
                      <span className="eyebrow eyebrow--gold">{targetBench ? "BENCH SEARCH" : "SELECTED POSITION"}</span>
                      <h2>{targetSlot?.label ?? "Any player"}</h2>
                      <p>{targetSlot ? `${targetSlot.position} · ${targetSlot.accepts.map((position) => position === "LCB" || position === "RCB" ? "CB" : position).filter((value, index, values) => values.indexOf(value) === index).join(" / ")}` : "No position restriction · ranked by bench impact"}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setTargetId(null)} aria-label="Clear selected position"><X size={16} aria-hidden /></button>
                </div>

                <div className={styles.filters}>
                  <label className={styles.search}>
                    <Search size={14} aria-hidden />
                    <span className="sr-only">Search players</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player or nation" />
                  </label>
                  <select aria-label="Tournament year" value={year} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : "")}>
                    <option value="">All years</option>
                    {[...new Set(draftEligiblePlayers.map((player) => player.tournamentYear))].sort((a,b) => b-a).map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <select aria-label="Player nation" value={nation} onChange={(event) => setNation(event.target.value)}>
                    <option value="">All nations</option>
                    {nationOptions.map(([code,name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                  <select aria-label="Card rarity" value={tier} onChange={(event) => setTier(event.target.value as PlayerStatusTier | "")}>
                    <option value="">All rarities</option>
                    {tierOptions.map((value) => <option key={value}>{value.replace("-", " ")}</option>)}
                  </select>
                  <select aria-label="Minimum rating" value={minimumRating} onChange={(event) => setMinimumRating(event.target.value ? Number(event.target.value) : "")}>
                    <option value="">Any rating</option><option value="85">85+</option><option value="90">90+</option><option value="95">95+</option>
                  </select>
                  <label className={styles.viewAll} title="Sort the current eligible players by overall rating">
                    <input type="checkbox" checked={viewAll} onChange={(event) => setViewAll(event.target.checked)} />
                    <span>BY OVR</span>
                  </label>
                </div>

                <div
                  className={styles.placeBar}
                  data-ready={Boolean(selectedPlayer && selectedCandidate)}
                  aria-live="polite"
                >
                  {selectedPlayer && selectedCandidate ? (
                    <>
                      <CircularPortrait
                        imageId={selectedPlayer.imageId}
                        subjectName={selectedPlayer.playerName}
                        era={selectedPlayer.era}
                        statusTier={selectedPlayer.statusTier}
                        countryCode={selectedPlayer.countryCode}
                        tournamentYear={selectedPlayer.tournamentYear}
                        size="compact"
                      />
                      <div className={styles.placeIdentity}>
                        <span>READY TO PLACE</span>
                        <b>{selectedPlayer.playerName}</b>
                        <small>
                          {flagForCountry(selectedPlayer.countryCode)} {selectedPlayer.countryCode}
                          {" · "}{selectedPlayer.tournamentYear}
                          {" · "}{selectedPlayer.overall} OVR
                        </small>
                      </div>
                      <dl className={styles.placeMetrics}>
                        {targetSlot && (
                          <div>
                            <dt>FIT</dt>
                            <dd>{selectedCandidate.positionFit}%</dd>
                          </div>
                        )}
                        <div>
                          <dt>TEAM</dt>
                          <dd>{selectedCandidate.overallGain >= 0 ? "+" : ""}{selectedCandidate.overallGain}</dd>
                        </div>
                        <div>
                          <dt>CHEM</dt>
                          <dd>{selectedCandidate.chemistryGain >= 0 ? "+" : ""}{selectedCandidate.chemistryGain}</dd>
                        </div>
                        <div>
                          <dt>MGR</dt>
                          <dd>{selectedCandidate.managerFitGain >= 0 ? "+" : ""}{selectedCandidate.managerFitGain}</dd>
                        </div>
                      </dl>
                      <div className={styles.placeActions}>
                        <small>Click {targetSlot?.label ?? targetBench?.toLocaleUpperCase()} or press Place</small>
                        <Button disabled={!canPlaceSelected} onClick={placePlayer}>PLACE</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.placePlaceholderIcon}>+</div>
                      <div className={styles.placeIdentity}>
                        <span>PLAYER SLOT</span>
                        <b>Select a player</b>
                        <small>
                          Choose a card below, then click {targetSlot?.label ?? targetBench?.toLocaleUpperCase()} or press Place.
                        </small>
                      </div>
                      <div className={styles.placePlaceholderRule} aria-hidden />
                      <div className={styles.placeActions}>
                        <small>No player selected</small>
                        <Button disabled>PLACE</Button>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.resultsHeader}>
                  <span><b>{candidates.length}</b> cards</span>
                  <small>{viewAll ? "HIGHEST OVR FIRST" : targetBench ? "BEST BENCH IMPACT FIRST" : "BEST SQUAD IMPACT FIRST"}</small>
                </div>

                <div className={styles.playerResults} aria-live="polite">
                  {candidates.map((candidate, index) => {
                    const isSelectedCard = selectedPlayerId === candidate.player.id;
                    const positionDepth = new Set([candidate.player.primaryPosition, ...candidate.player.eligiblePositions]).size;
                    return (
                      <article
                        className={styles.recommendation}
                        data-best={index === 0}
                        data-selected={isSelectedCard}
                        key={candidate.player.id}
                      >
                        <button
                          type="button"
                          className={styles.candidateHitArea}
                          onClick={() => selectPlayer(candidate.player.id)}
                          aria-label={`Select ${candidate.player.playerName} ${candidate.player.tournamentYear} for ${targetSlot?.label ?? "bench"}`}
                          aria-pressed={isSelectedCard}
                        />
                        <div className={styles.candidateMain}>
                          <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                          <CircularPortrait
                            imageId={candidate.player.imageId}
                            subjectName={candidate.player.playerName}
                            era={candidate.player.era}
                            statusTier={candidate.player.statusTier}
                            countryCode={candidate.player.countryCode}
                            tournamentYear={candidate.player.tournamentYear}
                            size="compact"
                          />
                          <span className={styles.candidateIdentity}>
                            <span>{flagForCountry(candidate.player.countryCode)} {candidate.player.countryCode} · {candidate.player.tournamentYear}</span>
                            <b>{candidate.player.playerName}</b>
                            <small>{candidate.player.primaryPosition} · {candidate.player.statusTier.replace("-", " ")}</small>
                          </span>
                          <span className={styles.candidateRating}>
                            <strong>{candidate.player.overall}</strong>
                            <small>OVR</small>
                          </span>
                        </div>
                        <div className={styles.candidateImpact}>
                          {targetSlot ? (
                            <span data-tone={candidate.positionFit >= 90 ? "great" : candidate.positionFit >= 70 ? "good" : "risk"}>
                              {candidate.positionFit}% FIT
                            </span>
                          ) : (
                            <span>{positionDepth} POS</span>
                          )}
                          <span data-positive={candidate.overallGain > 0}>
                            {candidate.overallGain >= 0 ? "+" : ""}{candidate.overallGain} OVR
                          </span>
                          <span data-positive={candidate.chemistryGain > 0}>
                            {candidate.chemistryGain >= 0 ? "+" : ""}{candidate.chemistryGain} CHEM
                          </span>
                          {index === 0 && <span className={styles.best}>{viewAll ? "TOP OVR" : "BEST"}</span>}
                          <button
                            type="button"
                            className={styles.inspectCandidate}
                            onClick={() => setInspected(candidate.player)}
                            aria-label={`Inspect ${candidate.player.playerName} ${candidate.player.tournamentYear}`}
                          >
                            <Eye size={12} aria-hidden />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {candidates.length === 0 && <p className={styles.noResults}>No eligible tournament cards match these filters.</p>}
                </div>
              </>
            )}
            <footer className={styles.panelFooter}><Button disabled={!canContinue} onClick={finalizeFreeSelection}>CHOOSE OPPONENT</Button></footer>
          </aside>
        </section>
      </main>

      {showSquad && <div className="drawer-backdrop" role="presentation" onMouseDown={() => setShowSquad(false)}><aside className={styles.squadDrawer} role="dialog" aria-modal="true" aria-label="Your fourteen" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="eyebrow eyebrow--gold">YOUR FOURTEEN</span><h2>SQUAD {lineup.length + bench.length}/14</h2></div><button type="button" className="icon-button" onClick={() => setShowSquad(false)} aria-label="Close squad"><X size={17} /></button></header>{[{label:"STARTING XI",items:picks.map((pick) => ({ key:pick.slotId, slot:formation.slots.find((slot) => slot.id === pick.slotId)?.label ?? "XI", player:playersById.get(pick.cardId) }))},{label:"BENCH",items:benchPicks.map((pick,index) => ({ key:pick.slotId, slot:`B${index+1}`, player:playersById.get(pick.cardId) }))}].map((section) => <section key={section.label}><span className="eyebrow">{section.label}</span>{section.items.map(({key,slot,player}) => player && <button type="button" key={key} onClick={() => setInspected(player)}><CircularPortrait imageId={player.imageId} subjectName={player.playerName} era={player.era} statusTier={player.statusTier} countryCode={player.countryCode} tournamentYear={player.tournamentYear} size="compact" /><span><b>{player.playerName}</b><small>{flagForCountry(player.countryCode)} {player.tournamentYear}</small></span><strong>{player.overall}</strong><i>{slot}</i></button>)}</section>)}</aside></div>}
      {showRandomize && <div className="dialog-backdrop" role="presentation"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="randomize-title"><span className="eyebrow eyebrow--gold">REPLACE CURRENT SQUAD</span><h2 id="randomize-title">Randomize all fourteen players?</h2><p>Your manually selected players will be replaced with a new valid, identity-safe squad.</p><div className="dialog__actions"><Button variant="secondary" onClick={() => setShowRandomize(false)}>KEEP CURRENT SQUAD</Button><Button onClick={() => { randomizeFreeSquad(); setShowRandomize(false); setTargetId(null); }}>RANDOMIZE SQUAD</Button></div></div></div>}
      {inspected && <PlayerDetails player={inspected} onClose={() => setInspected(null)} />}
    </div>
  );
}