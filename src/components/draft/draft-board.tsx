"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  RefreshCw,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { ManagerDetails } from "@/components/cards/manager-details";
import { PlayerAccolades } from "@/components/cards/player-accolades";
import { PlayerCard } from "@/components/cards/player-card";
import {
  modeledTagCopy,
  PlayerDetails,
  type PlayerFitContext,
} from "@/components/cards/player-details";
import { OpponentSelection } from "@/components/draft/opponent-selection";
import { TeamRatings } from "@/components/draft/team-ratings";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { MobileRespinDialog } from "@/components/mobile/mobile-respin-dialog";
import { Button } from "@/components/ui/button";
import { calculateEraFitDetails, getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import {
  getPlacementPenaltyPercent,
  getPositionFit,
} from "@/engine/draft";
import {
  calculateChemistry,
  explainChemistryChange,
  type ChemistryReason,
} from "@/engine/chemistry";
import { calculateTeamRatings } from "@/engine/ratings";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type {
  BenchSlotId,
  DraftPick,
  Formation,
  ManagerTournamentCard,
  PlayerTournamentCard,
} from "@/types/game";
import styles from "./draft-board.module.css";

const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];

const respinLabel = (remaining: number) =>
  remaining === 0 ? "PLAYER RESPINS USED" : `PLAYER RESPINS ×${remaining}`;

export function DraftBoard() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [showReset, setShowReset] = useState(false);
  const [showRespin, setShowRespin] = useState(false);
  const [isEnteringWorldCup, setIsEnteringWorldCup] = useState(false);
  const [inspected, setInspected] = useState<PlayerTournamentCard | null>(null);
  const [showManagerDetails, setShowManagerDetails] = useState(false);
  const [previewSlotId, setPreviewSlotId] = useState<string | null>(null);
  const [detailReturnFocus, setDetailReturnFocus] =
    useState<HTMLElement | null>(null);

  const formationId = useGameStore((state) => state.formationId)!;
  const gameMode = useGameStore((state) => state.gameMode);
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
  const manager = managerId ? managersById.get(managerId) : undefined;
  if (!formationId || !eraId || !manager) {
    return (
      <section className="loading-state" aria-live="polite">
        <div className="loading-emblem" />
        <p className="eyebrow">RETURNING TO COACH SELECTION</p>
      </section>
    );
  }
  const formation = getFormation(formationId);
  const era = getDraftEra(eraId);
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
  const chemistry = calculateChemistry(lineup, formation, {
    picks,
    manager,
    eraId,
    bench,
  });
  const rememberFocus = () => {
    const active = document.activeElement;
    setDetailReturnFocus(active instanceof HTMLElement ? active : null);
  };
  const openPlayer = (player: PlayerTournamentCard) => {
    rememberFocus();
    setInspected(player);
  };
  const closeDetail = (kind: "player" | "manager") => {
    if (kind === "player") setInspected(null);
    else setShowManagerDetails(false);
    const returnTarget = detailReturnFocus;
    window.requestAnimationFrame(() => returnTarget?.focus());
  };
  const playerFitContextFor = (
    player: PlayerTournamentCard,
  ): PlayerFitContext => {
    const pick = picks.find((candidate) => candidate.cardId === player.id);
    const slot = pick
      ? formation.slots.find((candidate) => candidate.id === pick.slotId)
      : undefined;
    const benchIndex = benchPicks.findIndex(
      (candidate) => candidate.cardId === player.id,
    );
    const positionFit = slot ? getPositionFit(player, slot) : null;
    const withoutPicks = picks.filter(
      (candidate) => candidate.cardId !== player.id,
    );
    const withoutLineup = lineup.filter(
      (candidate) => candidate.id !== player.id,
    );
    const withoutRatings = pick
      ? calculateTeamRatings(withoutLineup, formation, {
          picks: withoutPicks,
          manager,
          eraId,
          bench,
        })
      : null;
    const eraDetails =
      eraId === "all"
        ? null
        : calculateEraFitDetails(player, eraId, {
            manager,
            formation,
          });
    return {
      assignedSlot: slot
        ? slot.label
        : benchIndex >= 0
          ? `Bench ${benchIndex + 1}`
          : "Not placed",
      positionFit,
      placementPenalty:
        positionFit === null ? null : getPlacementPenaltyPercent(positionFit),
      eraTranslation: eraDetails?.fit ?? null,
      eraImpact: eraDetails?.impactPercent,
      managerFit: ratings.managerFit,
      chemistryContribution: withoutRatings
        ? ratings.chemistry - withoutRatings.chemistry
        : null,
      benchPriority: benchIndex >= 0 ? benchIndex + 1 : null,
    };
  };
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
  const activePreview =
    projectedPositionFits.find(
      (preview) => preview.slotId === previewSlotId && preview.canPlace,
    ) ?? bestPreview;

  useEffect(() => {
    const removePitchTitles = () => {
      document
        .querySelectorAll<HTMLElement>(".draft-pitch-panel .pitch-node[title]")
        .forEach((node) => node.removeAttribute("title"));
    };

    removePitchTitles();
    const frame = window.requestAnimationFrame(removePitchTitles);

    return () => window.cancelAnimationFrame(frame);
  }, [previewSlotId, selectedPlayerId, projectedPositionFits]);
  const projectedPicks: DraftPick[] =
    selectedPlayer && activePreview
      ? [
          ...picks,
          { slotId: activePreview.slotId, cardId: selectedPlayer.id },
        ]
      : picks;
  const projectedLineup =
    projectedPicks.length > picks.length
      ? [...lineup, selectedPlayer!]
      : lineup;
  const projectedRatings =
    projectedPicks.length > picks.length
      ? calculateTeamRatings(
          projectedLineup,
          formation,
          {
            picks: projectedPicks,
            manager,
            eraId,
            bench,
          },
        )
      : ratings;
  const projectedChemistry =
    projectedPicks.length > picks.length
      ? calculateChemistry(projectedLineup, formation, {
          picks: projectedPicks,
          manager,
          eraId,
          bench,
        })
      : chemistry;
  const headerProjectedRatings = pendingBenchPlayer
    ? calculateTeamRatings(lineup, formation, {
        picks,
        manager,
        eraId,
        bench: [...bench, pendingBenchPlayer],
      })
    : projectedRatings;
  const headerRatingStats = [
    {
      label: "ATK",
      value: ratings.attack,
      delta: Math.round(headerProjectedRatings.attack - ratings.attack),
    },
    {
      label: "MID",
      value: ratings.midfield,
      delta: Math.round(headerProjectedRatings.midfield - ratings.midfield),
    },
    {
      label: "DEF",
      value: ratings.defense,
      delta: Math.round(headerProjectedRatings.defense - ratings.defense),
    },
    {
      label: "CHEM",
      value: ratings.chemistry,
      delta: Math.round(headerProjectedRatings.chemistry - ratings.chemistry),
    },
    {
      label: "OVR",
      value: ratings.overall,
      delta: Math.round(headerProjectedRatings.overall - ratings.overall),
    },
  ];
  const selectedEraDetails = selectedPlayer && eraId !== "all"
    ? calculateEraFitDetails(selectedPlayer, eraId, {
        manager,
        formation,
      })
    : null;
  const chemistryReasons =
    selectedPlayer && activePreview && selectedEraDetails
      ? explainChemistryChange(chemistry, projectedChemistry, {
          positionFit: activePreview.fit,
          managerFit: projectedRatings.managerFit,
          eraFit: selectedEraDetails.fit,
        })
      : [];

  if (isEnteringWorldCup) {
    return (
      <section className="loading-state" aria-live="polite">
        <div className="loading-emblem" />
        <p className="eyebrow">OPENING THE WORLD CUP</p>
      </section>
    );
  }

  if (draftPhase === "opponent") {
    return (
      <div className="opponent-stage">
        <OpponentSelection
          eraId={eraId}
          onContinue={() => router.push("/match")}
        />
        {inspected && (
          <PlayerDetails
            player={inspected}
            fitContext={playerFitContextFor(inspected)}
            onClose={() => closeDetail("player")}
          />
        )}
        {showManagerDetails && (
          <ManagerDetails
            manager={manager}
            eraId={eraId}
            onClose={() => closeDetail("manager")}
          />
        )}
      </div>
    );
  }

  return (
    <section
      className={`draft-board ${styles.board}`}
      aria-labelledby="draft-heading"
    >
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
          className={styles.headerRatings}
          aria-label={`Live squad ratings. Attack ${ratings.attack}, midfield ${ratings.midfield}, defense ${ratings.defense}, chemistry ${ratings.chemistry}, overall ${ratings.overall}. ${squadCount} of 14 players drafted.`}
        >
          {headerRatingStats.map(({ label, value, delta }) => {
            const direction =
              delta > 0 ? "up" : delta < 0 ? "down" : undefined;
            return (
              <span
                key={label}
                data-emphasis={label === "OVR" || undefined}
                data-delta={direction}
              >
                <small>{label}</small>
                <strong>{value}</strong>
                <i
                  className={styles.ratingDelta}
                  data-direction={direction}
                  aria-label={
                    direction
                      ? `${label} ${delta > 0 ? "up" : "down"} ${Math.abs(delta)}`
                      : undefined
                  }
                  aria-hidden={!direction}
                >
                  {direction ? `${delta > 0 ? "+" : "−"}${Math.abs(delta)}` : "\u00A0"}
                </i>
              </span>
            );
          })}
        </div>
        <div className="draft-utilities">
          <span>
            {manager.managerName} · {formation.name} · {era.label}
          </span>
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

      <div className={`draft-layout ${styles.layout}`}>
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
            activeSlotId={selectedPlayer ? activePreview?.slotId : undefined}
            onSelectSlot={selectedPlayer ? placeSelectedPlayer : undefined}
            onInspectPlayer={openPlayer}
            onPreviewSlot={selectedPlayer ? setPreviewSlotId : undefined}
          />
          {selectedPlayer && (
            <SelectedPlayerSummary
              player={selectedPlayer}
              currentRatings={ratings}
              projectedRatings={projectedRatings}
              bestSlotLabel={
                formation.slots.find((slot) => slot.id === activePreview?.slotId)
                  ?.label
              }
              positionFit={activePreview?.fit}
              placementPenalty={activePreview?.penaltyPercent}
              eraFit={selectedEraDetails?.fit}
              eraImpact={selectedEraDetails?.impactPercent}
              managerFit={projectedRatings.managerFit}
              chemistryReasons={chemistryReasons}
              onCancel={cancelPlayerSelection}
              onOpenRecord={() => openPlayer(selectedPlayer)}
            />
          )}
          {bench.length > 0 && (
            <div className="bench-summary" aria-label="Current substitutes">
              {benchSlots.map((slotId, index) => {
                const player = playersById.get(
                  benchPicks.find((pick) => pick.slotId === slotId)?.cardId ?? "",
                );
                return (
                  <div key={slotId} data-filled={Boolean(player)}>
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
              onInspect={openPlayer}
              continueLabel={
                gameMode === "world-cup-run"
                  ? "Enter World Cup"
                  : "Choose opponent"
              }
              onContinue={() => {
                if (gameMode === "world-cup-run") {
                  setIsEnteringWorldCup(true);
                }
                finalizeBench();
                if (gameMode === "world-cup-run") {
                  router.push("/play/world-cup-run");
                }
              }}
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
                <div
                  className={`draft-choices__heading ${styles.choiceHeadingRow} ${styles.benchChoiceHeading}`}
                >
                  <div>
                    <span
                      className={`eyebrow eyebrow--gold ${styles.desktopBenchHeading}`}
                    >
                      BENCH SPIN / 05 · ROUND {benchPicks.length + 1}
                    </span>
                    <h2 className={styles.desktopBenchHeading}>
                      Choose a tactical alternative
                    </h2>
                    <span className={styles.mobileBenchHeading}>
                      BENCH {benchPicks.length + 1}
                    </span>
                    <h2 className={styles.mobileBenchHeading}>
                      Choose your{" "}
                      {(["first", "second", "third"] as const)[benchPicks.length]}{" "}
                      substitute.
                    </h2>
                  </div>
                  <RespinRow
                    canRespin={canRespin}
                    remaining={respinsRemaining}
                    onOpen={() => setShowRespin(true)}
                  />
                </div>
                <PlayerChoices
                  options={options}
                  eraId={eraId}
                  manager={manager}
                  formation={formation}
                  onSelect={selectPlayer}
                  onInspect={openPlayer}
                />
                {lineup.length > 0 && (
                  <div className={styles.ratingsBelowChoices}>
                    <TeamRatings ratings={ratings} expanded display="models" />
                  </div>
                )}
              </>
            )
          ) : startersComplete ? (
            <div className="draft-complete">
              <span className="eyebrow eyebrow--gold">XI SEALED</span>
              <Users size={30} aria-hidden />
              <h2>Three substitutes remain.</h2>
              <p>
                Bench order drives substitution priority and expected minutes.
                Choose three substitutes who complement your starting eleven.
              </p>
              <Button onClick={startBenchDraft}>
                Draft the bench <ArrowRight size={17} aria-hidden />
              </Button>
            </div>
          ) : (
            <>
              <div
                className={`draft-choices__heading ${styles.choiceHeadingRow}`}
              >
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
                {!selectedPlayer && (
                  <RespinRow
                    canRespin={canRespin}
                    remaining={respinsRemaining}
                    onOpen={() => setShowRespin(true)}
                  />
                )}
              </div>
              <PlayerChoices
                options={options}
                eraId={eraId}
                formation={formation}
                manager={manager}
                picks={picks}
                selectedPlayerId={selectedPlayerId}
                onSelect={selectPlayer}
                onInspect={openPlayer}
              />
              {lineup.length > 0 && (
                <div className={styles.ratingsBelowChoices}>
                  <TeamRatings ratings={ratings} expanded display="models" />
                </div>
              )}
              {!draftFeasible && (
                <p className="draft-feasibility-warning" role="alert">
                  This player cannot be placed without blocking a complete
                  starting eleven. Choose another card.
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
            <h2 id="reset-title">Return to coach selection?</h2>
            <p>
              Your environment remains. Your coach, formation, all {squadCount}{" "}
              squad picks, and every respin counter will be reset.
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
                  router.push("/play/manager");
                }}
              >
                Choose new coach
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRespin && (
        <>
          <div
            className={`dialog-backdrop ${styles.desktopPlayerRespinDialog}`}
            role="presentation"
          >
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
                All five choices will be replaced. The current round and your
                other respins remain unchanged.
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
          <MobileRespinDialog
            kind="player"
            remaining={respinsRemaining}
            onCancel={() => setShowRespin(false)}
            onConfirm={() => {
              respinPlayers();
              setShowRespin(false);
            }}
          />
        </>
      )}

      {inspected && (
        <PlayerDetails
          player={inspected}
          fitContext={playerFitContextFor(inspected)}
          onClose={() => closeDetail("player")}
        />
      )}
      {showManagerDetails && (
        <ManagerDetails
          manager={manager}
          eraId={eraId}
          onClose={() => closeDetail("manager")}
        />
      )}
    </section>
  );
}

function PlayerChoices({
  options,
  eraId,
  formation,
  manager,
  picks = [],
  selectedPlayerId,
  onSelect,
  onInspect,
}: {
  options: PlayerTournamentCard[];
  eraId: ReturnType<typeof useGameStore.getState>["eraId"] & string;
  formation?: ReturnType<typeof getFormation>;
  manager: ManagerTournamentCard;
  picks?: DraftPick[];
  selectedPlayerId?: string | null;
  onSelect: (cardId: string) => void;
  onInspect: (player: PlayerTournamentCard) => void;
}) {
  const reduceMotion = useReducedMotion();
  const filled = new Set(picks.map((pick) => pick.slotId));
  return (
    <div
      className={`draft-card-grid ${styles.cardGrid}`}
      aria-live="polite"
    >
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
            className={`${styles.option} ${
              selected ? "draft-option--selected" : ""
            } ${dimmed ? "draft-option--dimmed" : ""}`}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{
              opacity: dimmed ? 0.42 : 1,
              y: 0,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <PlayerCard
              player={player}
              onSelect={() => onSelect(player.id)}
              onInspect={() => onInspect(player)}
              selected={selected}
              compactDraft
              showFit
              positionFit={positionFit}
              eraFit={
                eraId === "all"
                  ? undefined
                  : calculateEraFitDetails(player, eraId, {
                      manager,
                      formation,
                    }).fit
              }
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
  positionFit,
  placementPenalty,
  eraFit,
  eraImpact,
  managerFit,
  chemistryReasons,
  onCancel,
  onOpenRecord,
}: {
  player: PlayerTournamentCard;
  currentRatings: ReturnType<typeof calculateTeamRatings>;
  projectedRatings: ReturnType<typeof calculateTeamRatings>;
  bestSlotLabel?: string;
  positionFit?: number;
  placementPenalty?: number;
  eraFit?: number;
  eraImpact?: number;
  managerFit: number;
  chemistryReasons: ChemistryReason[];
  onCancel: () => void;
  onOpenRecord: () => void;
}) {
  const chemistryChange =
    projectedRatings.chemistry - currentRatings.chemistry;
  const overallChange = projectedRatings.overall - currentRatings.overall;
  return (
    <aside
      className={`selected-player-summary selected-player-summary--${player.statusTier} ${styles.dossier}`}
      aria-label="Selected player preview"
    >
      <div className={styles.dossierIdentity}>
        <CircularPortrait
          imageId={player.imageId}
          subjectName={player.playerName}
          era={player.era}
          statusTier={player.statusTier}
          countryCode={player.countryCode}
          tournamentYear={player.tournamentYear}
          size="compact"
        />
        <span>
          <small className="eyebrow">SELECTED PLAYER</small>
          <b>{player.playerName}</b>
          <i>
            {flagForCountry(player.countryCode)} {player.countryName} ·{" "}
            {player.tournamentYear}
          </i>
        </span>
      </div>
      <div
        className={styles.dossierCardRating}
        aria-label={`${player.overall} overall, ${player.primaryPosition}`}
      >
        <strong>{player.overall}</strong>
        <span>{player.primaryPosition}</span>
      </div>
      <button
        type="button"
        className={`text-button ${styles.dossierCancel}`}
        onClick={onCancel}
      >
        <X size={13} aria-hidden /> Cancel
      </button>
      <dl className={styles.dossierMetrics}>
        <div>
          <dt>Best Position</dt>
          <dd>{bestSlotLabel ?? "None"}</dd>
        </div>
        <div>
          <dt>Position Fit</dt>
          <dd>{positionFit === undefined ? "—" : `${positionFit}%`}</dd>
          {Boolean(placementPenalty) && (
            <small>Placement Penalty −{placementPenalty}%</small>
          )}
        </div>
        <div>
          <dt>{eraFit === undefined ? "Match Era" : "Era Fit"}</dt>
          <dd>{eraFit === undefined ? "Neutral" : eraFit}</dd>
          {eraFit === undefined ? (
            <small>No era modifier</small>
          ) : Boolean(eraImpact) ? (
            <small>Era Impact −{eraImpact}%</small>
          ) : null}
        </div>
        <div>
          <dt>Manager Fit</dt>
          <dd>{managerFit}</dd>
        </div>
        <div>
          <dt>Projected Chemistry</dt>
          <dd>
            {projectedRatings.chemistry}
            <i>
              {chemistryChange > 0 ? "+" : ""}
              {chemistryChange}
            </i>
          </dd>
        </div>
        <div>
          <dt>Projected Overall</dt>
          <dd>
            {projectedRatings.overall}
            <i>
              {overallChange > 0 ? "+" : ""}
              {overallChange}
            </i>
          </dd>
        </div>
      </dl>
      <div className={styles.integratedChemistry}>
        <span>
          Current <b>{currentRatings.chemistry}</b>
        </span>
        <span>
          Projected <b>{projectedRatings.chemistry}</b>
        </span>
        <span data-positive={chemistryChange >= 0}>
          Exact delta <b>{chemistryChange > 0 ? "+" : ""}{chemistryChange}</b>
        </span>
        {chemistryReasons.length > 0 && (
          <ul>
            {chemistryReasons.map((reason) => (
              <li key={reason.key}>
                {reason.label} <b>{reason.value > 0 ? "+" : ""}{reason.value}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PlayerAccolades
        player={player}
        compact
        onOpenRecord={onOpenRecord}
      />
      <details
        className={styles.dossierTags}
        id={`selected-player-tags-${player.id}`}
      >
        <summary>VIEW PLAYER TAGS</summary>
        <ul>
          {player.modeledTags.map((tag) => (
            <li key={tag}>
              <b>{tag}</b>
              <span>
                {modeledTagCopy[tag]?.effect ??
                  "Adds value when the role and system fit."}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}

function RespinRow({
  canRespin,
  remaining,
  onOpen,
}: {
  canRespin: boolean;
  remaining: number;
  onOpen: () => void;
}) {
  return (
    <div className={`respin-row ${styles.respinRow}`}>
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
        statusTier={player.statusTier}
        countryCode={player.countryCode}
        tournamentYear={player.tournamentYear}
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
  continueLabel,
  onContinue,
}: {
  benchPicks: Array<{ slotId: BenchSlotId; cardId: string }>;
  onMove: (slotId: BenchSlotId, direction: -1 | 1) => void;
  onInspect: (player: PlayerTournamentCard) => void;
  continueLabel: string;
  onContinue: () => void;
}) {
  const reduceMotion = useReducedMotion();

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
            <motion.li
              key={player.id}
              layout="position"
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      layout: {
                        type: "spring",
                        stiffness: 430,
                        damping: 34,
                        mass: 0.78,
                      },
                    }
              }
            >
              <span className="bench-priority">{index + 1}</span>
              <CircularPortrait
                imageId={player.imageId}
                subjectName={player.playerName}
                era={player.era}
                statusTier={player.statusTier}
                countryCode={player.countryCode}
                tournamentYear={player.tournamentYear}
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
            </motion.li>
          );
        })}
      </ol>
      <Button onClick={onContinue}>
        {continueLabel} <ArrowRight size={16} aria-hidden />
      </Button>
    </div>
  );
}
