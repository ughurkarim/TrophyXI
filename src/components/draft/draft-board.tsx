"use client";

import { motion } from "framer-motion";
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
  PlayerTournamentCard,
} from "@/types/game";

const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];

const respinLabel = (remaining: number) =>
  remaining === 0 ? "RESPINS USED" : `RESPINS ×${remaining}`;

export function DraftBoard() {
  const router = useRouter();
  const [showReset, setShowReset] = useState(false);
  const [showRespin, setShowRespin] = useState(false);
  const [inspected, setInspected] = useState<PlayerTournamentCard | null>(null);
  const formationId = useGameStore((state) => state.formationId)!;
  const eraId = useGameStore((state) => state.eraId)!;
  const managerId = useGameStore((state) => state.managerId)!;
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const draftPhase = useGameStore((state) => state.draftPhase);
  const selectedSlotId = useGameStore((state) => state.selectedSlotId);
  const pendingBenchCardId = useGameStore(
    (state) => state.pendingBenchCardId,
  );
  const optionIds = useGameStore((state) => state.optionIds);
  const respinsRemaining = useGameStore(
    (state) => state.playerRespinsRemaining,
  );
  const selectSlot = useGameStore((state) => state.selectSlot);
  const cancelSlot = useGameStore((state) => state.cancelSlot);
  const selectPlayer = useGameStore((state) => state.selectPlayer);
  const respinPlayers = useGameStore((state) => state.respinPlayers);
  const startBenchDraft = useGameStore((state) => state.startBenchDraft);
  const assignBenchPlayer = useGameStore(
    (state) => state.assignBenchPlayer,
  );
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
  const pendingBenchPlayer = pendingBenchCardId
    ? playersById.get(pendingBenchCardId)
    : undefined;
  const currentSlot = formation.slots.find(
    (slot) => slot.id === selectedSlotId,
  );
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
    optionIds.length === 3 &&
    !pendingBenchCardId &&
    (draftPhase === "starters" || draftPhase === "bench");

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
                  : currentSlot
                    ? "POSITION SELECTED"
                    : "YOUR NEXT MOVE"}
          </span>
          <h1 id="draft-heading">
            {draftPhase === "review"
              ? "Set your substitution priority"
              : draftPhase === "bench"
                ? `Draft substitute ${benchPicks.length + 1} of 3`
                : startersComplete
                  ? "Build the three-player bench"
                  : currentSlot
                    ? `Choose your ${currentSlot.label}`
                    : "Select any open position"}
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
          <strong className="respin-counter">
            {respinLabel(respinsRemaining)}
          </strong>
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
              {startersComplete ? "COMPLETE" : "SELECT A SLOT"}
            </span>
          </div>
          <TacticalPitch
            formation={formation}
            lineup={lineup}
            picks={picks}
            selectedSlotId={selectedSlotId}
            onSelectSlot={draftPhase === "starters" ? selectSlot : undefined}
            onInspectPlayer={setInspected}
          />
          <TeamRatings ratings={ratings} expanded />
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
                      BENCH DRAW / ROUND {benchPicks.length + 1}
                    </span>
                    <h2>Choose a tactical alternative</h2>
                  </div>
                  <p>Assignment follows card selection.</p>
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
                  copy="Starter and bench identities excluded · tactical variety guaranteed"
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
                You will assign every card, then reorder with accessible controls.
              </p>
              <Button onClick={startBenchDraft}>
                Draft the bench <ArrowRight size={17} aria-hidden />
              </Button>
            </div>
          ) : currentSlot ? (
            <>
              <div className="draft-choices__heading">
                <div>
                  <span className="eyebrow eyebrow--gold">ARCHIVE DRAW / 03</span>
                  <h2>Choose your {currentSlot.label}</h2>
                </div>
                <button type="button" className="text-button" onClick={cancelSlot}>
                  <X size={14} aria-hidden /> Change position
                </button>
              </div>
              <PlayerChoices
                options={options}
                eraId={eraId}
                currentSlot={currentSlot}
                onSelect={selectPlayer}
                onInspect={setInspected}
              />
              <RespinRow
                canRespin={canRespin}
                remaining={respinsRemaining}
                onOpen={() => setShowRespin(true)}
                copy="No duplicate identity · every tournament year remains eligible"
              />
            </>
          ) : (
            <div className="slot-prompt">
              <span className="eyebrow eyebrow--gold">THE BOARD IS YOURS</span>
              <h2>Draft in any order.</h2>
              <p>
                Choose an empty node before seeing three cards. Tournament year
                never filters availability; Translation measures performance in
                the selected environment.
              </p>
              <div className="slot-prompt__count">
                <b>{11 - picks.length}</b>
                <span>open positions</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {draftPhase === "review"
          ? "All fourteen players drafted. Review bench priority."
          : draftPhase === "bench"
            ? `${benchPicks.length} of 3 substitutes drafted.`
            : startersComplete
              ? "Starting eleven complete. Begin the bench draft."
              : currentSlot
                ? `Three options generated for ${currentSlot.label}.`
                : `${picks.length} of 11 starters drafted. Select an open position.`}
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
              Your environment, manager, and formation remain. All {squadCount}{" "}
              squad picks are cleared.
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
              PLAYER RESPIN · {respinLabel(respinsRemaining)}
            </span>
            <h2 id="respin-title">Reject all three cards?</h2>
            <p>
              These player identities cannot return when enough valid alternatives
              exist. The selected starter slot or bench round remains fixed.
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
                Confirm respin
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
  currentSlot,
  onSelect,
  onInspect,
}: {
  options: PlayerTournamentCard[];
  eraId: ReturnType<typeof useGameStore.getState>["eraId"] & string;
  currentSlot?: ReturnType<typeof getFormation>["slots"][number];
  onSelect: (cardId: string) => void;
  onInspect: (player: PlayerTournamentCard) => void;
}) {
  return (
    <div className="draft-card-grid" aria-live="polite">
      {options.map((player) => (
        <motion.div
          key={`${currentSlot?.id ?? "bench"}-${player.id}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <PlayerCard
            player={player}
            onSelect={() => onSelect(player.id)}
            onInspect={() => onInspect(player)}
            showFit
            positionFit={
              currentSlot ? getPositionFit(player, currentSlot) : undefined
            }
            eraFit={calculateEraFit(player, eraId)}
          />
        </motion.div>
      ))}
    </div>
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
                ? "Highest priority"
                : index === 1
                  ? "Medium priority"
                  : "Lowest priority"}
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
        Choose historical opponent <ArrowRight size={16} aria-hidden />
      </Button>
    </div>
  );
}
