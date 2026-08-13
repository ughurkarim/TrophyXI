"use client";

import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Eye,
  Grid3X3,
  Move,
  Scale,
  Search,
  Shield,
  Target,
  Trash2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerDetails } from "@/components/cards/player-details";
import { OpponentSelection } from "@/components/draft/opponent-selection";
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
import { useLocalizedContent } from "@/i18n/content";

const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];
const tierOptions: PlayerStatusTier[] = ["legend", "icon", "elite", "standout", "reliable", "role-player", "limited"];

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

function TacticalIcon({ style, size = 14 }: { style: string; size?: number }) {
  const normalized = style.toLocaleLowerCase();

  if (normalized === "pressing") return <Zap size={size} aria-hidden />;
  if (normalized === "counter") return <ArrowRight size={size} aria-hidden />;
  if (normalized === "defensive") return <Shield size={size} aria-hidden />;
  if (normalized === "direct") return <Target size={size} aria-hidden />;
  if (normalized === "fluid") return <Waves size={size} aria-hidden />;
  if (normalized === "possession") return <CircleDot size={size} aria-hidden />;
  return <Scale size={size} aria-hidden />;
}

export default function FreeSelectionPage() {
  const router = useRouter();
  const t = useTranslations("freeSelection");
  const statusT = useTranslations("players.card.status");
  const eraT = useTranslations("gameSetup.era.options");
  const localize = useLocalizedContent();
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
  const targetDisplayLabel = targetSlot?.label ?? (
    targetBench ? `B${benchSlots.indexOf(targetBench) + 1}` : undefined
  );
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
    const impactPool = [...eligible]
      .sort(
        (first, second) =>
          second.player.overall - first.player.overall ||
          second.positionFit - first.positionFit ||
          second.player.eligiblePositions.length -
            first.player.eligiblePositions.length ||
          first.player.playerName.localeCompare(second.player.playerName),
      )
      .slice(0, viewAll ? 300 : targetBench ? 120 : 180);
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
    return <main className="game-page loading-state"><div className="loading-emblem" /><p className="eyebrow">{t("loading")}</p></main>;
  }

  if (draftPhase === "opponent") {
    return <div className={`game-page game-page--stadium ${era.themeClass}`}><GameHeader step={t("opponentStep")} /><SaveNotice /><main className="container game-main"><OpponentSelection eraId={eraId} onContinue={() => router.push("/match")} onEditSquad={editFreeSelection} /></main></div>;
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
    <div className={`game-page game-page--stadium ${era.themeClass} ${styles.screen}`}>
      <GameHeader step={t("step")} />
      <SaveNotice />
      <main className={`container ${styles.main}`}>
        <header className={styles.heading}>
          <div className={styles.headingCopy}>
            <p className="eyebrow eyebrow--gold">{t("eyebrow")}</p>
            <h1>{t("title")}</h1>
            <p>{t("description")}</p>
          </div>

          <section className={styles.statsPanel} aria-label={t("teamStatsAria")}>
            <div className={styles.statsHeadline}>
              <span className={styles.statsKicker}>{t("teamStats")}</span>
              <div className={styles.statsNumbers}>
                {[
                  ["ATK", ratings.attack],
                  ["MID", ratings.midfield],
                  ["DEF", ratings.defense],
                  ["CHEM", ratings.chemistry],
                  ["OVR", ratings.overall],
                ].map(([label, value]) => (
                  <span className={styles.statsNumber} data-emphasis={label === "OVR" || undefined} key={label}>
                    <strong>{value}</strong>
                    <small>{label}</small>
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.statsModels}>
              <span className={styles.statsModel}>
                <span>
                  <small>{t("legacy")}</small>
                  <b>{Math.round(ratings.legacyScore ?? 0)}</b>
                  <em>+{Math.max(0, Math.min(4, ratings.legacyBonus ?? 0))} {t("overallShort")}</em>
                </span>
                <i aria-hidden>
                  <b style={{ width: `${Math.max(0, Math.min(100, Math.round(ratings.legacyScore ?? 0)))}%` }} />
                </i>
              </span>

              <span className={styles.statsModel}>
                <span>
                  <small>{t("chemistry")}</small>
                  <b>{ratings.chemistry}</b>
                  <em>{ratings.chemistry >= 75 ? t("chemistryStates.strong") : ratings.chemistry >= 40 ? t("chemistryStates.building") : t("chemistryStates.disconnected")}</em>
                </span>
                <i aria-hidden>
                  <b style={{ width: `${Math.max(0, Math.min(100, Math.round(ratings.chemistry)))}%` }} />
                </i>
              </span>
            </div>
          </section>

          <section className={styles.summaryPanel} aria-label={t("squadContextAria")}>
            <div className={styles.summaryGrid}>
              <span className={`${styles.summaryCard} ${styles.summaryManager}`}>
                <span className={styles.summaryPortrait}>
                  <CircularPortrait
                    imageId={manager.imageId}
                    subjectName={manager.managerName}
                    era={manager.era}
                    countryCode={manager.countryCode}
                    tournamentYear={manager.tournamentYear}
                    size="compact"
                  />
                </span>
                <span>
                  <small>{t("manager")}</small>
                  <b>{manager.managerName}</b>
                </span>
              </span>
              <span className={styles.summaryCard}>
                <span className={styles.summaryIcon} aria-hidden>
                  <TacticalIcon style={manager.style} size={13} />
                </span>
                <span>
                  <small>{t("style")}</small>
                  <b>{localize(manager.style)}</b>
                </span>
              </span>
              <span className={styles.summaryCard}>
                <span className={styles.summaryIcon} aria-hidden>
                  <Grid3X3 size={14} />
                </span>
                <span>
                  <small>{t("formation")}</small>
                  <b>{formation.name}</b>
                </span>
              </span>
              <span className={styles.summaryCard}>
                <span className={styles.summaryIcon} aria-hidden>
                  <CalendarDays size={14} />
                </span>
                <span>
                  <small>{t("era")}</small>
                  <b>{eraT(`${era.id}.label`)}</b>
                </span>
              </span>
            </div>
          </section>
        </header>

        <section className={styles.workspace} aria-label={t("workspaceAria")}>
          <section className={styles.pitchPanel}>
            <span className={styles.formationLabel}>{formation.name}</span>
            <div className={styles.pitchAura}>
              <TacticalPitch formation={formation} lineup={lineup} picks={picks} fitPreviews={selectedPlayer ? fitPreviews : []} activeSlotId={targetSlot?.id} selectedSlotId={targetSlot?.id} goalkeeperYCap={88} layoutMode="free-selection" onSelectSlot={selectTarget} onSelectFilledSlot={selectFilledTarget} />
            </div>
            <div className={styles.benchStrip}>
              <span className={styles.benchLabel}>{t("bench")}</span>
              <div className={styles.benchSlots} aria-label={t("benchSlotsAria")}>
              {benchSlots.map((slotId, index) => {
                const pick = benchPicks.find((candidate) => candidate.slotId === slotId);
                const player = pick ? playersById.get(pick.cardId) : undefined;
                return <button type="button" key={slotId} className={[targetId === slotId ? styles.activeBench : "", !player ? styles.emptyBench : ""].filter(Boolean).join(" ")} onClick={() => player ? selectFilledTarget(slotId, player) : selectTarget(slotId)}><span className={styles.benchNumber}>B{index + 1}</span>{player ? <><CircularPortrait imageId={player.imageId} subjectName={player.playerName} era={player.era} statusTier={player.statusTier} countryCode={player.countryCode} tournamentYear={player.tournamentYear} size="compact" /><span className={styles.benchIdentity} title={`${player.playerName} · ${player.overall} · ${player.tournamentYear}`}><b>{player.playerName.split(" ").at(-1)}</b><small>{player.primaryPosition} · {player.overall} {t("overallShort")} · {player.tournamentYear}</small></span></> : <span className={styles.benchIdentity}><b>{t("openBench")}</b><small>{t("selectAnyPlayer")}</small></span>}</button>;
              })}
              </div>
            </div>
          </section>

          <aside className={styles.playerPanel}>
            {!targetSlot && !targetBench ? (
              <div className={styles.emptyState}><span className="eyebrow eyebrow--gold">{t("positionFirst")}</span><h2>{t("selectPosition")}</h2><p>{t("cardsAppear")}</p><div><b>{t("starterRolesRemain", { count: needs.length })}</b><span>{needs.slice(0, 8).join(" · ")}{needs.length > 8 ? "…" : ""}</span><b>{t("benchPlacesRemain", { count: 3 - bench.length })}</b></div></div>
            ) : filledTarget ? (
              <div className={styles.filledActions}><span className="eyebrow eyebrow--gold">{t("filledPosition")} · {targetDisplayLabel}</span><CircularPortrait imageId={filledTarget.player.imageId} subjectName={filledTarget.player.playerName} era={filledTarget.player.era} statusTier={filledTarget.player.statusTier} countryCode={filledTarget.player.countryCode} tournamentYear={filledTarget.player.tournamentYear} size="standard" /><h2>{filledTarget.player.playerName}</h2><p>{flagForCountry(filledTarget.player.countryCode)} {localize(filledTarget.player.countryName)} · {filledTarget.player.tournamentYear} · {filledTarget.player.overall} {t("overallShort")}</p><div><Button variant="secondary" onClick={() => setInspected(filledTarget.player)}><Eye size={14} aria-hidden /> {t("inspect")}</Button><Button variant="secondary" onClick={() => { removeFreePlayer(filledTarget.player.id); setFilledTarget(null); }}>{t("replace")}</Button><Button variant="secondary" onClick={() => { const player = filledTarget.player; removeFreePlayer(player.id); selectPlayer(player.id); setTargetId(null); setFilledTarget(null); }}><Move size={14} aria-hidden /> {t("move")}</Button><Button variant="ghost" onClick={() => { removeFreePlayer(filledTarget.player.id); setTargetId(null); setFilledTarget(null); }}><Trash2 size={14} aria-hidden /> {t("remove")}</Button></div></div>
            ) : (
              <>
                <div className={styles.panelHeading}>
                  <div className={styles.positionLockup}>
                    <span className={styles.positionBadge}>{targetDisplayLabel}</span>
                    <div>
                      <span className="eyebrow eyebrow--gold">{targetBench ? t("benchSearch") : t("selectedPosition")}</span>
                      <h2>{targetSlot?.label ?? t("anyPlayer")}</h2>
                      <p>{targetSlot ? `${targetSlot.position} · ${targetSlot.accepts.map((position) => position === "LCB" || position === "RCB" ? "CB" : position).filter((value, index, values) => values.indexOf(value) === index).join(" / ")}` : t("noPositionRestriction")}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setTargetId(null)} aria-label={t("clearPosition")}><X size={16} aria-hidden /></button>
                </div>

                <div className={styles.filters}>
                  <label className={styles.search}>
                    <Search size={14} aria-hidden />
                    <span className="sr-only">{t("searchPlayers")}</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} />
                  </label>
                  <label className={styles.selectShell}>
                    <select aria-label={t("tournamentYear")} value={year} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : "")}>
                      <option value="">{t("allYears")}</option>
                      {[...new Set(draftEligiblePlayers.map((player) => player.tournamentYear))].sort((a,b) => b-a).map((value) => <option key={value}>{value}</option>)}
                    </select>
                    <span className={styles.selectChevron} aria-hidden>⌄</span>
                  </label>
                  <label className={styles.selectShell}>
                    <select aria-label={t("playerNation")} value={nation} onChange={(event) => setNation(event.target.value)}>
                      <option value="">{t("allNations")}</option>
                      {nationOptions.map(([code,name]) => <option key={code} value={code}>{localize(name)}</option>)}
                    </select>
                    <span className={styles.selectChevron} aria-hidden>⌄</span>
                  </label>
                  <label className={styles.selectShell}>
                    <select aria-label={t("cardRarity")} value={tier} onChange={(event) => setTier(event.target.value as PlayerStatusTier | "")}>
                      <option value="">{t("allRarities")}</option>
                      {tierOptions.map((value) => <option key={value} value={value}>{statusT(value)}</option>)}
                    </select>
                    <span className={styles.selectChevron} aria-hidden>⌄</span>
                  </label>
                  <label className={styles.selectShell}>
                    <select aria-label={t("minimumRating")} value={minimumRating} onChange={(event) => setMinimumRating(event.target.value ? Number(event.target.value) : "")}>
                      <option value="">{t("anyRating")}</option><option value="85">85+</option><option value="90">90+</option><option value="95">95+</option>
                    </select>
                    <span className={styles.selectChevron} aria-hidden>⌄</span>
                  </label>
                  <label className={styles.viewAll} title={t("sortByOverallTitle")}>
                    <input type="checkbox" checked={viewAll} onChange={(event) => setViewAll(event.target.checked)} />
                    <span>{t("byOverall")}</span>
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
                        <span>{t("readyToPlace")}</span>
                        <b>{selectedPlayer.playerName}</b>
                        <small>
                          {flagForCountry(selectedPlayer.countryCode)} {selectedPlayer.countryCode}
                          {" · "}{selectedPlayer.tournamentYear}
                        </small>
                      </div>
                      <dl className={styles.placeMetrics}>
                        {targetSlot && (
                          <div>
                            <dt>{t("fit")}</dt>
                            <dd>{selectedCandidate.positionFit}%</dd>
                          </div>
                        )}
                        <div>
                          <dt>{t("team")}</dt>
                          <dd>{selectedCandidate.overallGain >= 0 ? "+" : ""}{selectedCandidate.overallGain}</dd>
                        </div>
                        <div>
                          <dt>{t("chemShort")}</dt>
                          <dd>{selectedCandidate.chemistryGain >= 0 ? "+" : ""}{selectedCandidate.chemistryGain}</dd>
                        </div>
                        <div>
                          <dt>{t("overallShort")}</dt>
                          <dd>{selectedPlayer.overall}</dd>
                        </div>
                      </dl>
                      <div className={styles.placeActions}>
                        <small>{t("placeHint", { target: targetDisplayLabel ?? "" })}</small>
                        <Button disabled={!canPlaceSelected} onClick={placePlayer}>{t("place")}</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.placePlaceholderIcon}>+</div>
                      <div className={styles.placeIdentity}>
                        <span>{t("playerSlot")}</span>
                        <b>{t("selectPlayer")}</b>
                        <small>
                          {t("chooseCardHint", { target: targetDisplayLabel ?? "" })}
                        </small>
                      </div>
                      <div className={styles.placePlaceholderRule} aria-hidden />
                      <div className={styles.placeActions}>
                        <small>{t("noPlayerSelected")}</small>
                        <Button disabled>{t("place")}</Button>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.resultsHeader}>
                  <small>{viewAll ? t("sort.highestOverall") : targetBench ? t("sort.bestBench") : t("sort.bestSquad")}</small>
                </div>

                <div className={styles.playerResults} aria-live="polite">
                  {candidates.map((candidate, index) => {
                    const isSelectedCard = selectedPlayerId === candidate.player.id;
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
                          aria-label={t("selectCandidateAria", { player: candidate.player.playerName, year: candidate.player.tournamentYear, target: targetSlot?.label ?? t("bench") })}
                          aria-pressed={isSelectedCard}
                        />
                        <div className={`${styles.candidateMain} ${targetBench ? styles.candidateMainBench : ""}`}>
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
                            <b>
                              {candidate.player.playerName}
                              {index === 0 && <em>{viewAll ? t("topOverall") : t("best")}</em>}
                            </b>
                            <span>{flagForCountry(candidate.player.countryCode)} {candidate.player.countryCode} · {candidate.player.tournamentYear} · {candidate.player.primaryPosition} · {statusT(candidate.player.statusTier)}</span>
                          </span>
                          {targetSlot && (
                            <span className={styles.candidateStat}>
                              <small>{t("fit")}</small>
                              <b data-tone={candidate.positionFit >= 90 ? "great" : candidate.positionFit >= 70 ? "good" : "risk"}>
                                {candidate.positionFit}%
                              </b>
                            </span>
                          )}
                          <span className={styles.candidateStat}>
                            <small>{t("team")}</small>
                            <b>{candidate.overallGain >= 0 ? "+" : ""}{candidate.overallGain}</b>
                          </span>
                          <span className={styles.candidateStat}>
                            <small>{t("chemShort")}</small>
                            <b>{candidate.chemistryGain >= 0 ? "+" : ""}{candidate.chemistryGain}</b>
                          </span>
                          <span className={styles.candidateRating}>
                            <strong>{candidate.player.overall}</strong>
                            <small>{t("overallShort")}</small>
                          </span>
                          <button
                            type="button"
                            className={styles.inspectCandidate}
                            onClick={() => setInspected(candidate.player)}
                            aria-label={t("viewProfileAria", { player: candidate.player.playerName, year: candidate.player.tournamentYear })}
                          >
                            <Eye size={13} aria-hidden />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {candidates.length === 0 && <p className={styles.noResults}>{t("noResults")}</p>}
                </div>
              </>
            )}
          </aside>
        </section>

        <footer className={styles.pageFooter}>
          <Button className={styles.continueButton} disabled={!canContinue} onClick={finalizeFreeSelection}>
            {t("continueToSquad")} <span aria-hidden>→</span>
          </Button>
        </footer>
      </main>
      {inspected && <PlayerDetails player={inspected} onClose={() => setInspected(null)} />}
    </div>
  );
}
