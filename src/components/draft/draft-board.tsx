"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  RefreshCw,
  RotateCcw,
  ShieldQuestion,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { PlayerCard } from "@/components/cards/player-card";
import { PlayerDetails } from "@/components/cards/player-details";
import { OpponentSelection } from "@/components/draft/opponent-selection";
import { TeamRatings } from "@/components/draft/team-ratings";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { Button } from "@/components/ui/button";
import { calculateEraFit, getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import { getPositionFit } from "@/engine/draft";
import { calculateTeamRatings } from "@/engine/ratings";
import { useGameStore } from "@/store/game-store";
import type {
  BenchSlotId,
  DraftPick,
  PlayerTournamentCard,
} from "@/types/game";

const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];

const respinLabel = (remaining: number) =>
  remaining === 0 ? "PLAYER RESPINS USED" : `PLAYER RESPINS ×${remaining}`;

export function DraftBoard() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [showReset, setShowReset] = useState(false);
  const [showRespin, setShowRespin] = useState(false);
  const [inspected, setInspected] = useState<PlayerTournamentCard | null>(null);
  const formationId = useGameStore((state) => state.formationId)!;
  const eraId = useGameStore((state) => state.eraId)!;
  const managerId = useGameStore((state) => state.managerId)!;
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const draftPhase = useGameStore((state) => state.draftPhase);
  const selectedPlayerId = useGameStore((state) => state.selectedPlayerId);
  const pendingBenchCardId = useGameStore(
    (state) => state.pendingBenchCardId,
  );
  const optionIds = useGameStore((state) => state.optionIds);
  const projectedPositionFits = useGameStore(
    (state) => state.projectedPositionFits,
  );
  const draftFeasible = useGameStore((state) => state.draftFeasible);
  const lastPlacementFeedback = useGameStore(
    (state) => state.lastPlacementFeedback,
  );
  const respinsRemaining = useGameStore(
    (state) => state.playerRespinsRemaining,
  );
  const formationRespinRemaining = useGameStore(
    (state) => state.formationRespinRemaining,
  );
  const selectPlayer = useGameStore((state) => state.selectPlayer);
  const placeSelectedPlayer = useGameStore(
    (state) => state.placeSelectedPlayer,
  );
  const cancelPlayerSelection = useGameStore(
    (state) => state.cancelPlayerSelection,
  );
  const respinPlayers = useGameStore((state) => state.respinPlayers);
  const startBenchDraft = useGameStore((state) => state.startBenchDraft);
  const assignBenchPlayer = useGameStore((state) => state.assignBenchPlayer);
  const cancelBenchAssignment = useGameStore(
    (state) => state.cancelBenchAssignment,
  );
  const moveBenchPlayer = useGameStore((state) => state.moveBenchPlayer);
  const finalizeBench = useGameStore((state) => state.finalizeBench);
  const resetDraft = useGameStore((state) => state.resetDraft);

  const formation = getFormation(formationId);
  const era = getDraftEra(eraId);
  const manager = managersById.get(managerId)!;
  const lineup = useMemo(
    () =>
      picks
        .map((pick) => playersById.get(pick.cardId))
        .filter((player): player is PlayerTournamentCard => Boolean(player)),
    [picks],
  );
  const bench = useMemo(
    () =>
      benchSlots
        .map((slotId) =>
          playersById.get(
            benchPicks.find((pick) => pick.slotId === slotId)?.cardId ?? "",
          ),
        )
        .filter((player): player is PlayerTournamentCard => Boolean(player)),
    [benchPicks],
  );
  const options = optionIds
    .map((id) => playersById.get(id))
    .filter((player): player is PlayerTournamentCard => Boolean(player));
  const selectedPlayer = selectedPlayerId
    ? playersById.get(selectedPlayerId)
    : undefined;
  const pendingBenchPlayer = pendingBenchCardId
    ? playersById.get(pendingBenchCardId)
    : undefined;
  const ratings = calculateTeamRatings(lineup, formation, {
    picks,
    manager,
    eraId,
    bench,
  });
  const startersComplete = picks.length === 11;
  const squadCount = picks.length + benchPicks.length;
  const canRespin =
    respinsRemaining > 0 &&
    optionIds.length === 5 &&
    !selectedPlayerId &&
    !pendingBenchCardId &&
    (draftPhase === "starters" || draftPhase === "bench");
  const bestPreview = [...projectedPositionFits]
    .filter((preview) => preview.canPlace)
    .sort((first, second) => second.fit - first.fit)[0];
  const projectedPicks: DraftPick[] =
    selectedPlayer && bestPreview
      ? [
          ...picks,
          { slotId: bestPreview.slotId, cardId: selectedPlayer.id },
        ]
      : picks;
  const projectedRatings =
    projectedPicks.length > picks.length
      ? calculateTeamRatings(
          [...lineup, selectedPlayer!],
          formation,
          {
            picks: projectedPicks,
            manager,
            eraId,
            bench,
          },
        )
      : ratings;

  if (draftPhase === "opponent") {
    return (
      <OpponentSelection
        eraId={eraId}
        onContinue={() => router.push("/match")}
      />
    );
  }

  return (
    <section className="draft-board" aria-labelledby="draft-heading">
      <div className="draft-statusbar">
        <div>
          <span className="eyebrow">
            {draftPhase === "review"
              ? "BENCH REVIEW"
              : draftPhase === "bench"
                ? "SUBSTITUTE DRAFT"
                : startersComplete
                  ? "STARTING XI COMPLETE"
                  : selectedPlayer
                    ? "PLAYER SELECTED"
                    : "FIVE-CARD SPIN"}
          </span>
          <h1 id="draft-heading">
            {draftPhase === "review"
              ? "Set your substitution priority"
              : draftPhase === "bench"
                ? `Draft substitute ${benchPicks.length + 1} of 3`
                : startersComplete
                  ? "Build the three-player bench"
                  : selectedPlayer
                    ? `Place ${selectedPlayer.playerName}`
                    : `Choose starter ${picks.length + 1} of 11`}
          </h1>
        </div>
        <div
          className="draft-progress"
          aria-label={`${squadCount} of 14 players drafted`}
        >
          <div>
            <span style={{ width: `${(squadCount / 14) * 100}%` }} />
          </div>
          <b>{squadCount} / 14</b>
        </div>
        <div className="draft-utilities">
          <span>
            {manager.managerName} · {formation.name} · {era.label}
          </span>
          <div className="draft-counter-stack">
            <strong className="respin-counter">
              {respinLabel(respinsRemaining)}
            </strong>
            <small>
              {formationRespinRemaining
                ? "FORMATION RESPIN ×1"
                : "FORMATION RESPIN USED"}
            </small>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowReset(true)}
            aria-label="Reset draft"
          >
            <RotateCcw size={17} aria-hidden />
          </button>
        </div>
      </div>

      <div className="draft-layout">
        <div className="draft-pitch-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR XI</span>
              <h2>Tactical board</h2>
            </div>
            <span className="live-dot">
              {startersComplete
                ? "COMPLETE"
                : selectedPlayer
                  ? "SELECT POSITION"
                  : "SELECT PLAYER"}
            </span>
          </div>
          <TacticalPitch
            formation={formation}
            lineup={lineup}
            picks={picks}
            fitPreviews={selectedPlayer ? projectedPositionFits : []}
            onSelectSlot={selectedPlayer ? placeSelectedPlayer : undefined}
            onInspectPlayer={setInspected}
          />
          {selectedPlayer && (
            <SelectedPlayerSummary
              player={selectedPlayer}
              currentRatings={ratings}
              projectedRatings={projectedRatings}
              bestSlotLabel={
                formation.slots.find((slot) => slot.id === bestPreview?.slotId)
                  ?.label
              }
              onCancel={cancelPlayerSelection}
            />
          )}
          <TeamRatings ratings={ratings} expanded />
          {lastPlacementFeedback && draftPhase === "starters" && (
            <motion.div
              className="placement-feedback"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              role="status"
            >
              <b>
                {playersById.get(lastPlacementFeedback.cardId)?.playerName}{" "}
                {playersById.get(lastPlacementFeedback.cardId)?.tournamentYear} →{" "}
                {lastPlacementFeedback.slotLabel}
              </b>
              <span>Position Fit {lastPlacementFeedback.fit}%</span>
              <span>
                Placement Penalty −{lastPlacementFeedback.penaltyPercent}%
              </span>
              <span>Era Translation {lastPlacementFeedback.eraFit}%</span>
              <span>
                Chemistry{" "}
                {lastPlacementFeedback.chemistryChange >= 0 ? "+" : ""}
                {lastPlacementFeedback.chemistryChange}
              </span>
              <span>
                Team Overall{" "}
                {lastPlacementFeedback.overallChange >= 0 ? "+" : ""}
                {lastPlacementFeedback.overallChange}
              </span>
            </motion.div>
          )}
          {bench.length > 0 && (
            <div className="bench-summary" aria-label="Current substitutes">
              {benchSlots.map((slotId, index) => {
                const player = playersById.get(
                  benchPicks.find((pick) => pick.slotId === slotId)?.cardId ?? "",
                );
                return (
                  <div key={slotId}>
                    <span>BENCH {index + 1}</span>
                    <b>{player?.playerName ?? "Open"}</b>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="draft-choices">
          {draftPhase === "review" ? (
            <BenchReview
              benchPicks={benchPicks}
              onMove={moveBenchPlayer}
              onInspect={setInspected}
              onContinue={finalizeBench}
            />
          ) : draftPhase === "bench" ? (
            pendingBenchPlayer ? (
              <BenchAssignment
                player={pendingBenchPlayer}
                occupied={benchPicks.map((pick) => pick.slotId)}
                onAssign={assignBenchPlayer}
                onCancel={cancelBenchAssignment}
              />
            ) : (
              <>
                <div className="draft-choices__heading">
                  <div>
                    <span className="eyebrow eyebrow--gold">
                      BENCH SPIN / 05 · ROUND {benchPicks.length + 1}
                    </span>
                    <h2>Choose a tactical alternative</h2>
                  </div>
                  <p>Select a player, then choose Bench 1, 2, or 3.</p>
                </div>
                <PlayerChoices
                  options={options}
                  eraId={eraId}
                  onSelect={selectPlayer}
                  onInspect={setInspected}
                />
                <RespinRow
                  canRespin={canRespin}
                  remaining={respinsRemaining}
                  onOpen={() => setShowRespin(true)}
                  copy="Starter and bench identities excluded · five unique identities"
                />
              </>
            )
          ) : startersComplete ? (
            <div className="draft-complete">
              <span className="eyebrow eyebrow--gold">XI SEALED</span>
              <Users size={30} aria-hidden />
              <h2>Three substitutes remain.</h2>
              <p>
                Bench order drives substitution priority and expected minutes.
                Each round presents five identity-safe cards.
              </p>
              <Button onClick={startBenchDraft}>
                Draft the bench <ArrowRight size={17} aria-hidden />
              </Button>
            </div>
          ) : (
            <>
              <div className="draft-choices__heading">
                <div>
                  <span className="eyebrow eyebrow--gold">
                    ARCHIVE SPIN / 05 · ROUND {picks.length + 1}
                  </span>
                  <h2>
                    {selectedPlayer
                      ? "Now choose an open position"
                      : "Choose one player first"}
                  </h2>
                </div>
                {selectedPlayer && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={cancelPlayerSelection}
                  >
                    <X size={14} aria-hidden /> Cancel Selection
                  </button>
                )}
              </div>
              <PlayerChoices
                options={options}
                eraId={eraId}
                formation={formation}
                picks={picks}
                selectedPlayerId={selectedPlayerId}
                onSelect={selectPlayer}
                onInspect={setInspected}
              />
              {!selectedPlayer && (
                <RespinRow
                  canRespin={canRespin}
                  remaining={respinsRemaining}
                  onOpen={() => setShowRespin(true)}
                  copy="Five unique identities · completion path guaranteed"
                />
              )}
              {!draftFeasible && (
                <p className="draft-feasibility-warning" role="alert">
                  No legal completion path is available. Cancel this selection
                  and choose another player.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {draftPhase === "review"
          ? "All fourteen players drafted. Review bench priority."
          : draftPhase === "bench"
            ? `${benchPicks.length} of 3 substitutes drafted. Five player cards available.`
            : startersComplete
              ? "Starting eleven complete. Begin the bench draft."
              : selectedPlayer
                ? `${selectedPlayer.playerName} ${selectedPlayer.tournamentYear} selected. ${projectedPositionFits.length} open positions available.`
                : `${picks.length} of 11 starters drafted. Five player cards available. Select a player first.`}
      </p>

      {showReset && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <span className="eyebrow eyebrow--gold">RESET DRAFT</span>
            <h2 id="reset-title">Return every player card?</h2>
            <p>
              Your environment, manager, formation, and formation-respin state
              remain. All {squadCount} squad picks are cleared.
            </p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowReset(false)}
                autoFocus
              >
                Keep drafting
              </Button>
              <Button
                onClick={() => {
                  resetDraft();
                  setShowReset(false);
                }}
              >
                Reset squad
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRespin && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="respin-title"
          >
            <span className="eyebrow eyebrow--gold">
              {respinLabel(respinsRemaining)}
            </span>
            <h2 id="respin-title">Reject all five player cards?</h2>
            <p>
              These identities cannot return when enough valid alternatives
              exist. The current starter or bench round remains unchanged.
            </p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowRespin(false)}
                autoFocus
              >
                Keep options
              </Button>
              <Button
                onClick={() => {
                  respinPlayers();
                  setShowRespin(false);
                }}
              >
                Confirm player respin
              </Button>
            </div>
          </div>
        </div>
      )}

      {inspected && (
        <PlayerDetails player={inspected} onClose={() => setInspected(null)} />
      )}
    </section>
  );
}

function PlayerChoices({
  options,
  eraId,
  formation,
  picks = [],
  selectedPlayerId,
  onSelect,
  onInspect,
}: {
  options: PlayerTournamentCard[];
  eraId: ReturnType<typeof useGameStore.getState>["eraId"] & string;
  formation?: ReturnType<typeof getFormation>;
  picks?: DraftPick[];
  selectedPlayerId?: string | null;
  onSelect: (cardId: string) => void;
  onInspect: (player: PlayerTournamentCard) => void;
}) {
  const reduceMotion = useReducedMotion();
  const filled = new Set(picks.map((pick) => pick.slotId));
  return (
    <div className="draft-card-grid" aria-live="polite">
      {options.map((player) => {
        const positionFit = formation
          ? Math.max(
              ...formation.slots
                .filter((slot) => !filled.has(slot.id))
                .map((slot) => getPositionFit(player, slot)),
            )
          : undefined;
        const selected = selectedPlayerId === player.id;
        const dimmed = Boolean(selectedPlayerId && !selected);
        return (
          <motion.div
            key={`five-card-${picks.length}-${player.id}`}
            className={`${selected ? "draft-option--selected" : ""} ${
              dimmed ? "draft-option--dimmed" : ""
            }`}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{
              opacity: dimmed ? 0.42 : 1,
              y: reduceMotion ? 0 : selected ? -4 : 0,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <PlayerCard
              player={player}
              onSelect={() => onSelect(player.id)}
              onInspect={() => onInspect(player)}
              selected={selected}
              showFit
              positionFit={positionFit}
              eraFit={calculateEraFit(player, eraId)}
              actionLabel={
                selected
                  ? `Cancel ${player.playerName} ${player.tournamentYear} selection`
                  : `Select ${player.playerName} ${player.tournamentYear} for placement, rated ${player.overall}`
              }
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function SelectedPlayerSummary({
  player,
  currentRatings,
  projectedRatings,
  bestSlotLabel,
  onCancel,
}: {
  player: PlayerTournamentCard;
  currentRatings: ReturnType<typeof calculateTeamRatings>;
  projectedRatings: ReturnType<typeof calculateTeamRatings>;
  bestSlotLabel?: string;
  onCancel: () => void;
}) {
  return (
    <aside className="selected-player-summary" aria-label="Selected player preview">
      <CircularPortrait
        imageId={player.imageId}
        subjectName={player.playerName}
        era={player.era}
        size="compact"
      />
      <div>
        <span className="eyebrow">SELECTED PLAYER</span>
        <b>
          {player.playerName} {player.tournamentYear}
        </b>
        <small>
          Preview at best open fit{bestSlotLabel ? ` · ${bestSlotLabel}` : ""}
        </small>
      </div>
      <dl>
        <div>
          <dt>Current Chemistry</dt>
          <dd>{currentRatings.chemistry}</dd>
        </div>
        <div>
          <dt>Projected Chemistry</dt>
          <dd>{projectedRatings.chemistry}</dd>
        </div>
        <div>
          <dt>Current Overall</dt>
          <dd>{currentRatings.overall}</dd>
        </div>
        <div>
          <dt>Projected Overall</dt>
          <dd>{projectedRatings.overall}</dd>
        </div>
      </dl>
      <button type="button" className="text-button" onClick={onCancel}>
        <X size={14} aria-hidden /> Cancel Selection
      </button>
    </aside>
  );
}

function RespinRow({
  canRespin,
  remaining,
  onOpen,
  copy,
}: {
  canRespin: boolean;
  remaining: number;
  onOpen: () => void;
  copy: string;
}) {
  return (
    <div className="respin-row">
      <p>
        <ShieldQuestion size={15} aria-hidden />
        {copy}
      </p>
      <button
        type="button"
        className="button button--secondary"
        disabled={!canRespin}
        onClick={onOpen}
      >
        <RefreshCw size={15} aria-hidden />
        {respinLabel(remaining)}
      </button>
    </div>
  );
}

function BenchAssignment({
  player,
  occupied,
  onAssign,
  onCancel,
}: {
  player: PlayerTournamentCard;
  occupied: BenchSlotId[];
  onAssign: (slotId: BenchSlotId) => void;
  onCancel: () => void;
}) {
  return (
    <div className="bench-assignment">
      <span className="eyebrow eyebrow--gold">ASSIGN SUBSTITUTE</span>
      <CircularPortrait
        imageId={player.imageId}
        subjectName={player.playerName}
        era={player.era}
        size="featured"
      />
      <h2>{player.playerName}</h2>
      <p>
        {player.tournamentYear} · {player.primaryPosition} ·{" "}
        {player.eligiblePositions.join(" / ")}
      </p>
      <div className="bench-slot-buttons">
        {benchSlots.map((slotId, index) => (
          <Button
            key={slotId}
            variant="secondary"
            disabled={occupied.includes(slotId)}
            onClick={() => onAssign(slotId)}
          >
            Bench {index + 1}
            <small>
              {index === 0
                ? "Highest priority · usually most minutes"
                : index === 1
                  ? "Medium priority"
                  : "Lowest priority · usually fewest minutes"}
            </small>
          </Button>
        ))}
      </div>
      <button type="button" className="text-button" onClick={onCancel}>
        <X size={14} aria-hidden /> Choose another card
      </button>
    </div>
  );
}

function BenchReview({
  benchPicks,
  onMove,
  onInspect,
  onContinue,
}: {
  benchPicks: Array<{ slotId: BenchSlotId; cardId: string }>;
  onMove: (slotId: BenchSlotId, direction: -1 | 1) => void;
  onInspect: (player: PlayerTournamentCard) => void;
  onContinue: () => void;
}) {
  return (
    <div className="bench-review">
      <span className="eyebrow eyebrow--gold">ORDERED BENCH</span>
      <h2>Priority changes expected minutes.</h2>
      <p>
        Bench 1 is considered first and normally plays most. Use the buttons to
        reorder without drag-and-drop.
      </p>
      <ol>
        {benchSlots.map((slotId, index) => {
          const player = playersById.get(
            benchPicks.find((pick) => pick.slotId === slotId)?.cardId ?? "",
          );
          if (!player) return null;
          return (
            <li key={slotId}>
              <span className="bench-priority">{index + 1}</span>
              <CircularPortrait
                imageId={player.imageId}
                subjectName={player.playerName}
                era={player.era}
                size="compact"
              />
              <button
                type="button"
                className="bench-player-copy"
                onClick={() => onInspect(player)}
              >
                <b>{player.playerName}</b>
                <span>
                  {player.tournamentYear} · {player.primaryPosition} ·{" "}
                  {index === 0 ? "25–40" : index === 1 ? "12–28" : "3–18"} min
                </span>
              </button>
              <div className="bench-reorder">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${player.playerName} up`}
                  disabled={index === 0}
                  onClick={() => onMove(slotId, -1)}
                >
                  <ArrowUp size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${player.playerName} down`}
                  disabled={index === 2}
                  onClick={() => onMove(slotId, 1)}
                >
                  <ArrowDown size={16} aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <Button onClick={onContinue}>
        Choose opponent <ArrowRight size={16} aria-hidden />
      </Button>
    </div>
  );
}
