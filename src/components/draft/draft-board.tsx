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
import { useTranslations } from "next-intl";
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
import { useLocalizedContent } from "@/i18n/content";
import { useGameStore } from "@/store/game-store";
import type {
  BenchSlotId,
  DraftPick,
  ManagerTournamentCard,
  PlayerTournamentCard,
} from "@/types/game";
import styles from "./draft-board.module.css";

const benchSlots: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];

export function DraftBoard() {
  const router = useRouter();
  const t = useTranslations("draft");
  const eraT = useTranslations("gameSetup.era.options");
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

  if (!formationId || !eraId || !manager) {
    return (
      <section className="loading-state" aria-live="polite">
        <div className="loading-emblem" />
        <p className="eyebrow">{t("returning")}</p>
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
          ? t("benchNumber", { number: benchIndex + 1 })
          : t("notPlaced"),
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
        <p className="eyebrow">{t("openingWorldCup")}</p>
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
              ? t("status.benchReview")
              : draftPhase === "bench"
                ? t("status.substituteDraft")
                : startersComplete
                  ? t("status.startingComplete")
                  : selectedPlayer
                    ? t("status.playerSelected")
                    : t("status.fiveCardSpin")}
          </span>
          <h1 id="draft-heading">
            {draftPhase === "review"
              ? t("headings.priority")
              : draftPhase === "bench"
                ? t("headings.draftSubstitute", { current: benchPicks.length + 1, total: 3 })
                : startersComplete
                  ? t("headings.buildBench")
                  : selectedPlayer
                    ? t("headings.placePlayer", { player: selectedPlayer.playerName })
                    : t("headings.chooseStarter", { current: picks.length + 1, total: 11 })}
          </h1>
        </div>
        <div
          className={styles.headerRatings}
          aria-label={t("ratingsAria", { attack: ratings.attack, midfield: ratings.midfield, defense: ratings.defense, chemistry: ratings.chemistry, overall: ratings.overall, count: squadCount, total: 14 })}
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
                      ? t("ratingDelta", { label, direction: delta > 0 ? t("up") : t("down"), value: Math.abs(delta) })
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
            {manager.managerName} · {formation.name} · {eraT(`${era.id}.label`)}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowReset(true)}
            aria-label={t("resetDraft")}
          >
            <RotateCcw size={17} aria-hidden />
          </button>
        </div>
      </div>

      <div className={`draft-layout ${styles.layout}`}>
        <div className="draft-pitch-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t("yourXi")}</span>
              <h2>{t("tacticalBoard")}</h2>
            </div>
            <span className="live-dot">
              {startersComplete
                ? t("complete")
                : selectedPlayer
                  ? t("selectPosition")
                  : t("selectPlayer")}
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
            <div className="bench-summary" aria-label={t("currentSubstitutes")}>
              {benchSlots.map((slotId, index) => {
                const player = playersById.get(
                  benchPicks.find((pick) => pick.slotId === slotId)?.cardId ?? "",
                );
                return (
                  <div key={slotId} data-filled={Boolean(player)}>
                    <span>{t("benchNumber", { number: index + 1 })}</span>
                    <b>{player?.playerName ?? t("open")}</b>
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
                  ? t("enterWorldCup")
                  : t("chooseOpponent")
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
                      {t("benchSpin", { round: benchPicks.length + 1 })}
                    </span>
                    <h2 className={styles.desktopBenchHeading}>
                      {t("chooseAlternative")}
                    </h2>
                    <span className={styles.mobileBenchHeading}>
                      {t("benchNumber", { number: benchPicks.length + 1 })}
                    </span>
                    <h2 className={styles.mobileBenchHeading}>
                      {t("chooseOrdinalSubstitute", { position: benchPicks.length + 1 })}
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
              <span className="eyebrow eyebrow--gold">{t("xiSealed")}</span>
              <Users size={30} aria-hidden />
              <h2>{t("threeSubstitutes")}</h2>
              <p>{t("benchDescription")}</p>
              <Button onClick={startBenchDraft}>
                {t("draftBench")} <ArrowRight size={17} aria-hidden />
              </Button>
            </div>
          ) : (
            <>
              <div
                className={`draft-choices__heading ${styles.choiceHeadingRow}`}
              >
                <div>
                  <span className="eyebrow eyebrow--gold">
                    {t("archiveSpin", { round: picks.length + 1 })}
                  </span>
                  <h2>
                    {selectedPlayer
                      ? t("chooseOpenPosition")
                      : t("choosePlayerFirst")}
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
                  {t("infeasible")}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {draftPhase === "review"
          ? t("announcements.review")
          : draftPhase === "bench"
            ? t("announcements.bench", { count: benchPicks.length, total: 3 })
            : startersComplete
              ? t("announcements.startingComplete")
              : selectedPlayer
                ? t("announcements.playerSelected", { player: selectedPlayer.playerName, year: selectedPlayer.tournamentYear, count: projectedPositionFits.length })
                : t("announcements.starters", { count: picks.length, total: 11 })}
      </p>

      {showReset && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <span className="eyebrow eyebrow--gold">{t("resetDraft")}</span>
            <h2 id="reset-title">{t("resetTitle")}</h2>
            <p>{t("resetDescription", { count: squadCount })}</p>
            <div className="dialog__actions">
              <Button
                variant="secondary"
                onClick={() => setShowReset(false)}
                autoFocus
              >
                {t("keepDrafting")}
              </Button>
              <Button
                onClick={() => {
                  resetDraft();
                  setShowReset(false);
                  router.push("/play/manager");
                }}
              >
                {t("chooseNewCoach")}
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
                {respinsRemaining === 0 ? t("respinsUsed") : t("respins", { count: respinsRemaining })}
              </span>
              <h2 id="respin-title">{t("respinTitle")}</h2>
              <p>{t("respinDescription")}</p>
              <div className="dialog__actions">
                <Button
                  variant="secondary"
                  onClick={() => setShowRespin(false)}
                  autoFocus
                >
                  {t("keepOptions")}
                </Button>
                <Button
                  onClick={() => {
                    respinPlayers();
                    setShowRespin(false);
                  }}
                >
                  {t("confirmRespin")}
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
  const t = useTranslations("draft");
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
                  ? t("cancelSelectionAria", { player: player.playerName, year: player.tournamentYear })
                  : t("selectForPlacementAria", { player: player.playerName, year: player.tournamentYear, rating: player.overall })
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
  const t = useTranslations("draft.playerPreview");
  const localize = useLocalizedContent();
  const chemistryChange =
    projectedRatings.chemistry - currentRatings.chemistry;
  const overallChange = projectedRatings.overall - currentRatings.overall;
  return (
    <aside
      className={`selected-player-summary selected-player-summary--${player.statusTier} ${styles.dossier}`}
      aria-label={t("aria")}
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
          <small className="eyebrow">{t("selectedPlayer")}</small>
          <b>{player.playerName}</b>
          <i>
            {flagForCountry(player.countryCode)} {localize(player.countryName)} ·{" "}
            {player.tournamentYear}
          </i>
        </span>
      </div>
      <div
        className={styles.dossierCardRating}
        aria-label={t("ratingAria", { rating: player.overall, position: player.primaryPosition })}
      >
        <strong>{player.overall}</strong>
        <span>{player.primaryPosition}</span>
      </div>
      <button
        type="button"
        className={`text-button ${styles.dossierCancel}`}
        onClick={onCancel}
      >
        <X size={13} aria-hidden /> {t("cancel")}
      </button>
      <dl className={styles.dossierMetrics}>
        <div>
          <dt>{t("bestPosition")}</dt>
          <dd>{bestSlotLabel ?? t("none")}</dd>
        </div>
        <div>
          <dt>{t("positionFit")}</dt>
          <dd>{positionFit === undefined ? "—" : `${positionFit}%`}</dd>
          {Boolean(placementPenalty) && (
            <small>{t("placementPenalty", { value: placementPenalty ?? 0 })}</small>
          )}
        </div>
        <div>
          <dt>{eraFit === undefined ? t("matchEra") : t("eraFit")}</dt>
          <dd>{eraFit === undefined ? t("neutral") : eraFit}</dd>
          {eraFit === undefined ? (
            <small>{t("noEraModifier")}</small>
          ) : Boolean(eraImpact) ? (
            <small>{t("eraImpact", { value: eraImpact ?? 0 })}</small>
          ) : null}
        </div>
        <div>
          <dt>{t("managerFit")}</dt>
          <dd>{managerFit}</dd>
        </div>
        <div>
          <dt>{t("projectedChemistry")}</dt>
          <dd>
            {projectedRatings.chemistry}
            <i>
              {chemistryChange > 0 ? "+" : ""}
              {chemistryChange}
            </i>
          </dd>
        </div>
        <div>
          <dt>{t("projectedOverall")}</dt>
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
          {t("current")} <b>{currentRatings.chemistry}</b>
        </span>
        <span>
          {t("projected")} <b>{projectedRatings.chemistry}</b>
        </span>
        <span data-positive={chemistryChange >= 0}>
          {t("exactDelta")} <b>{chemistryChange > 0 ? "+" : ""}{chemistryChange}</b>
        </span>
        {chemistryReasons.length > 0 && (
          <ul>
            {chemistryReasons.map((reason) => (
              <li key={reason.key}>
                {t(`chemistryReasons.${reason.key}`)} <b>{reason.value > 0 ? "+" : ""}{reason.value}</b>
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
        <summary>{t("viewTags")}</summary>
        <ul>
          {player.modeledTags.map((tag) => (
            <li key={tag}>
              <b>{tag}</b>
              <span>
                {modeledTagCopy[tag]?.effect ??
                  t("tagFallback")}
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
  const t = useTranslations("draft");
  return (
    <div className={`respin-row ${styles.respinRow}`}>
      <button
        type="button"
        className="button button--secondary"
        disabled={!canRespin}
        onClick={onOpen}
      >
        <RefreshCw size={15} aria-hidden />
        {remaining === 0 ? t("respinsUsed") : t("respins", { count: remaining })}
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
  const t = useTranslations("draft.bench");
  return (
    <div className="bench-assignment">
      <span className="eyebrow eyebrow--gold">{t("assign")}</span>
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
            {t("number", { number: index + 1 })}
            <small>
              {index === 0
                ? t("priorityHigh")
                : index === 1
                  ? t("priorityMedium")
                  : t("priorityLow")}
            </small>
          </Button>
        ))}
      </div>
      <button type="button" className="text-button" onClick={onCancel}>
        <X size={14} aria-hidden /> {t("chooseAnother")}
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
  const t = useTranslations("draft.bench");

  return (
    <div className="bench-review">
      <span className="eyebrow eyebrow--gold">{t("ordered")}</span>
      <h2>{t("priorityTitle")}</h2>
      <p>{t("priorityDescription")}</p>
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
                  {t("minutes", { range: index === 0 ? "25–40" : index === 1 ? "12–28" : "3–18" })}
                </span>
              </button>
              <div className="bench-reorder">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("moveUp", { player: player.playerName })}
                  disabled={index === 0}
                  onClick={() => onMove(slotId, -1)}
                >
                  <ArrowUp size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("moveDown", { player: player.playerName })}
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
