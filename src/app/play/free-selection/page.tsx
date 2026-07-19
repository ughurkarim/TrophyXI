"use client";

import { Dices, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PlayerCard } from "@/components/cards/player-card";
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
import { calculateTeamRatings } from "@/engine/ratings";
import { useGameStore } from "@/store/game-store";
import { POSITIONS } from "@/types/game";
import type {
  BenchSlotId,
  PlayerStatusTier,
  PlayerTournamentCard,
  Position,
} from "@/types/game";
import styles from "./free-selection.module.css";

const PAGE_SIZE = 24;
const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];
const tierOptions: PlayerStatusTier[] = [
  "legend",
  "icon",
  "elite",
  "standout",
  "reliable",
  "role-player",
  "limited",
];

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
  const fitPreviews = useGameStore(
    (state) => state.projectedPositionFits,
  );
  const selectPlayer = useGameStore((state) => state.selectPlayer);
  const placeSelectedPlayer = useGameStore(
    (state) => state.placeSelectedPlayer,
  );
  const assignFreeBenchPlayer = useGameStore(
    (state) => state.assignFreeBenchPlayer,
  );
  const removeFreePlayer = useGameStore(
    (state) => state.removeFreePlayer,
  );
  const randomizeFreeSquad = useGameStore(
    (state) => state.randomizeFreeSquad,
  );
  const finalizeFreeSelection = useGameStore(
    (state) => state.finalizeFreeSelection,
  );
  const editFreeSelection = useGameStore(
    (state) => state.editFreeSelection,
  );
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [year, setYear] = useState<number | "">("");
  const [tier, setTier] = useState<PlayerStatusTier | "">("");
  const [sort, setSort] = useState("overall-desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [slotPreview, setSlotPreview] = useState<{
    cardId: string;
    slotId: string;
  } | null>(null);
  const [inspected, setInspected] =
    useState<PlayerTournamentCard | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (gameMode !== "free-selection") router.replace("/play");
    else if (!eraId) router.replace("/play/era");
    else if (!managerId) router.replace("/play/manager");
    else if (!formationId) router.replace("/play/formation");
  }, [eraId, formationId, gameMode, hydrated, managerId, router]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return draftEligiblePlayers
      .filter(
        (player) =>
          (!normalizedQuery ||
            `${player.playerName} ${player.countryName} ${player.tournamentYear}`
              .toLocaleLowerCase()
              .includes(normalizedQuery)) &&
          (!position ||
            player.primaryPosition === position ||
            player.eligiblePositions.includes(position)) &&
          (!year || player.tournamentYear === year) &&
          (!tier || player.statusTier === tier),
      )
      .sort((first, second) => {
        if (sort === "name") {
          return (
            first.playerName.localeCompare(second.playerName) ||
            second.tournamentYear - first.tournamentYear
          );
        }
        if (sort === "year-desc") {
          return (
            second.tournamentYear - first.tournamentYear ||
            second.overall - first.overall
          );
        }
        if (sort === "year-asc") {
          return (
            first.tournamentYear - second.tournamentYear ||
            second.overall - first.overall
          );
        }
        return (
          second.overall - first.overall ||
          second.tournamentYear - first.tournamentYear ||
          first.playerName.localeCompare(second.playerName)
        );
      });
  }, [position, query, sort, tier, year]);

  if (
    !hydrated ||
    gameMode !== "free-selection" ||
    !eraId ||
    !managerId ||
    !formationId
  ) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">OPENING FREE SELECTION</p>
      </main>
    );
  }

  const era = getDraftEra(eraId);
  const formation = getFormation(formationId);
  const manager = managersById.get(managerId)!;
  const lineup = picks
    .map((pick) => playersById.get(pick.cardId))
    .filter(
      (player): player is PlayerTournamentCard => Boolean(player),
    );
  const bench = benchPicks
    .map((pick) => playersById.get(pick.cardId))
    .filter(
      (player): player is PlayerTournamentCard => Boolean(player),
    );
  const ratings = calculateTeamRatings(lineup, formation, {
    picks,
    manager,
    eraId,
    bench,
  });
  const selectedPlayer = selectedPlayerId
    ? playersById.get(selectedPlayerId)
    : undefined;
  const usedIdentityIds = new Set(
    [...lineup, ...bench].map((player) => player.playerIdentityId),
  );
  const canContinue =
    lineup.length === 11 &&
    bench.length === 3;

  if (draftPhase === "opponent") {
    return (
      <div
        className={`game-page game-page--stadium ${era.themeClass}`}
      >
        <GameHeader step="OPPONENT / 05" />
        <SaveNotice />
        <main className="container game-main">
          <OpponentSelection
            eraId={eraId}
            onContinue={() => router.push("/match")}
            onEditSquad={editFreeSelection}
          />
        </main>
      </div>
    );
  }

  const resetVisible = () => setVisibleCount(PAGE_SIZE);
  const bestPreview = [...fitPreviews]
    .filter((preview) => preview.canPlace)
    .sort((first, second) => second.fit - first.fit)[0];
  const activePreview =
    fitPreviews.find(
      (preview) =>
        slotPreview?.cardId === selectedPlayerId &&
        preview.slotId === slotPreview.slotId &&
        preview.canPlace,
    ) ?? bestPreview;
  const projectedPicks =
    selectedPlayer && activePreview
      ? [
          ...picks,
          {
            slotId: activePreview.slotId,
            cardId: selectedPlayer.id,
          },
        ]
      : picks;
  const projectedRatings =
    selectedPlayer && activePreview
      ? calculateTeamRatings([...lineup, selectedPlayer], formation, {
          picks: projectedPicks,
          manager,
          eraId,
          bench,
        })
      : ratings;
  const selectedEraFit = selectedPlayer
    ? calculateEraFitDetails(selectedPlayer, eraId, {
        manager,
        formation,
      }).fit
    : null;

  return (
    <div
      className={`game-page game-page--stadium ${era.themeClass}`}
    >
      <GameHeader step="FREE SELECTION / 04" />
      <SaveNotice />
      <main className={`container game-main ${styles.main}`}>
        <header className={styles.heading}>
          <div>
            <p className="eyebrow eyebrow--gold">FREE SELECTION</p>
            <h1>Build your archive XI.</h1>
            <p>
              Select a card, review Position Fit on the pitch, then place it.
              Bench order remains Bench 1, Bench 2, Bench 3; a backup
              goalkeeper is optional.
            </p>
          </div>
          <Button variant="secondary" onClick={randomizeFreeSquad}>
            <Dices size={16} aria-hidden /> RANDOMIZE SQUAD
          </Button>
        </header>

        <section className={styles.builder} aria-label="Squad builder">
          <div className={styles.pitchPanel}>
            <div className={styles.context}>
              <span>{manager.managerName}</span>
              <span>{manager.style}</span>
              <span>{formation.name}</span>
              <span>{era.label}</span>
            </div>
            <TacticalPitch
              formation={formation}
              lineup={lineup}
              picks={picks}
              fitPreviews={fitPreviews}
              activeSlotId={
                selectedPlayer ? activePreview?.slotId : undefined
              }
              onSelectSlot={selectedPlayer ? placeSelectedPlayer : undefined}
              onInspectPlayer={setInspected}
              onPreviewSlot={
                selectedPlayer
                  ? (slotId) =>
                      setSlotPreview(
                        slotId
                          ? {
                              cardId: selectedPlayer.id,
                              slotId,
                            }
                          : null,
                      )
                  : undefined
              }
            />
            <TeamRatings ratings={ratings} expanded />
          </div>

          <aside className={styles.squadPanel}>
            <div className={styles.progress}>
              <span>STARTERS <b>{lineup.length}/11</b></span>
              <span>SUBSTITUTES <b>{bench.length}/3</b></span>
            </div>
            {selectedPlayer ? (
              <div className={styles.selected}>
                <span className="eyebrow eyebrow--gold">SELECTED CARD</span>
                <strong>
                  {selectedPlayer.playerName} {selectedPlayer.tournamentYear}
                </strong>
                <p>
                  Choose a valid highlighted pitch slot, or assign this card
                  to an ordered bench place.
                </p>
                <dl className={styles.previewMetrics}>
                  <div>
                    <dt>Position Fit</dt>
                    <dd>
                      {activePreview
                        ? `${activePreview.fit}%`
                        : "No valid slot"}
                    </dd>
                  </div>
                  <div>
                    <dt>Era Fit</dt>
                    <dd>{selectedEraFit ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Manager Fit</dt>
                    <dd>{projectedRatings.managerFit}</dd>
                  </div>
                  <div>
                    <dt>Projected Chemistry</dt>
                    <dd>
                      {projectedRatings.chemistry}
                      <small>
                        {projectedRatings.chemistry - ratings.chemistry >= 0
                          ? "+"
                          : ""}
                        {projectedRatings.chemistry - ratings.chemistry}
                      </small>
                    </dd>
                  </div>
                </dl>
                <div className={styles.benchActions}>
                  {benchSlots.map((slotId, index) => (
                    <Button
                      key={slotId}
                      variant="secondary"
                      onClick={() =>
                        assignFreeBenchPlayer(selectedPlayer.id, slotId)
                      }
                    >
                      BENCH {index + 1}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.instruction}>
                Choose a player card to preview every open position.
              </p>
            )}

            <div className={styles.roster}>
              <h2>STARTING XI</h2>
              {formation.slots.map((slot) => {
                const pick = picks.find((item) => item.slotId === slot.id);
                const player = pick
                  ? playersById.get(pick.cardId)
                  : undefined;
                return (
                  <div key={slot.id}>
                    <span>{slot.label}</span>
                    <b>{player?.playerName ?? "Open"}</b>
                    {player && (
                      <button
                        type="button"
                        onClick={() => removeFreePlayer(player.id)}
                        aria-label={`Remove ${player.playerName} from ${slot.label}`}
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    )}
                  </div>
                );
              })}
              <h2>SUBSTITUTES</h2>
              {benchSlots.map((slotId, index) => {
                const pick = benchPicks.find(
                  (item) => item.slotId === slotId,
                );
                const player = pick
                  ? playersById.get(pick.cardId)
                  : undefined;
                return (
                  <div key={slotId}>
                    <span>Bench {index + 1}</span>
                    <b>{player?.playerName ?? "Open"}</b>
                    {player && (
                      <button
                        type="button"
                        onClick={() => removeFreePlayer(player.id)}
                        aria-label={`Remove ${player.playerName} from Bench ${index + 1}`}
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              disabled={!canContinue}
              onClick={() => {
                finalizeFreeSelection();
              }}
            >
              CHOOSE OPPONENT
            </Button>
          </aside>
        </section>

        <section className={styles.archive} aria-labelledby="archive-title">
          <div className={styles.archiveHeading}>
            <div>
              <p className="eyebrow">THE PLAYER ARCHIVE</p>
              <h2 id="archive-title">Choose any tournament card.</h2>
            </div>
            <b>{filtered.length} cards</b>
          </div>
          <div className={styles.filters}>
            <label className={styles.search}>
              <span className="sr-only">Search players</span>
              <Search size={16} aria-hidden />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetVisible();
                }}
                placeholder="Search player, nation, or year"
              />
            </label>
            <select
              aria-label="Player position"
              value={position}
              onChange={(event) => {
                setPosition(event.target.value as Position | "");
                resetVisible();
              }}
            >
              <option value="">All positions</option>
              {POSITIONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select
              aria-label="Tournament year"
              value={year}
              onChange={(event) => {
                setYear(
                  event.target.value ? Number(event.target.value) : "",
                );
                resetVisible();
              }}
            >
              <option value="">All years</option>
              {[...new Set(draftEligiblePlayers.map((player) => player.tournamentYear))]
                .sort((first, second) => second - first)
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
            <select
              aria-label="Card tier"
              value={tier}
              onChange={(event) => {
                setTier(event.target.value as PlayerStatusTier | "");
                resetVisible();
              }}
            >
              <option value="">All tiers</option>
              {tierOptions.map((value) => (
                <option key={value} value={value}>
                  {value.replace("-", " ")}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort players"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="overall-desc">Overall: high to low</option>
              <option value="name">Name</option>
              <option value="year-desc">Newest tournament</option>
              <option value="year-asc">Oldest tournament</option>
            </select>
          </div>
          <div className={styles.cardGrid} aria-live="polite">
            {filtered.slice(0, visibleCount).map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                selected={selectedPlayerId === player.id}
                disabled={usedIdentityIds.has(player.playerIdentityId)}
                actionLabel={
                  usedIdentityIds.has(player.playerIdentityId)
                    ? `${player.playerName} identity already selected`
                    : `Select ${player.playerName} ${player.tournamentYear}`
                }
                onSelect={() => selectPlayer(player.id)}
                onInspect={() => setInspected(player)}
              />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <Button
              variant="secondary"
              onClick={() =>
                setVisibleCount((count) => count + PAGE_SIZE)
              }
            >
              SHOW MORE PLAYERS
            </Button>
          )}
        </section>
      </main>
      {inspected && (
        <PlayerDetails
          player={inspected}
          onClose={() => setInspected(null)}
        />
      )}
    </div>
  );
}
