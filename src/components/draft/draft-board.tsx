"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  RefreshCw,
  RotateCcw,
  ShieldQuestion,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayerCard } from "@/components/cards/player-card";
import { PlayerDetails } from "@/components/cards/player-details";
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
import type { PlayerTournamentCard } from "@/types/game";

export function DraftBoard() {
  const router = useRouter();
  const [showReset, setShowReset] = useState(false);
  const [showRespin, setShowRespin] = useState(false);
  const [inspected, setInspected] = useState<PlayerTournamentCard | null>(null);
  const formationId = useGameStore((state) => state.formationId)!;
  const eraId = useGameStore((state) => state.eraId)!;
  const managerId = useGameStore((state) => state.managerId)!;
  const picks = useGameStore((state) => state.picks);
  const selectedSlotId = useGameStore((state) => state.selectedSlotId);
  const optionIds = useGameStore((state) => state.optionIds);
  const respinUsed = useGameStore((state) => state.respinUsed);
  const respinStage = useGameStore((state) => state.respinStage);
  const selectSlot = useGameStore((state) => state.selectSlot);
  const cancelSlot = useGameStore((state) => state.cancelSlot);
  const selectPlayer = useGameStore((state) => state.selectPlayer);
  const respinPlayers = useGameStore((state) => state.respinPlayers);
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
  const options = optionIds
    .map((id) => playersById.get(id))
    .filter((player): player is PlayerTournamentCard => Boolean(player));
  const currentSlot = formation.slots.find(
    (slot) => slot.id === selectedSlotId,
  );
  const ratings = calculateTeamRatings(lineup, formation, {
    picks,
    manager,
    eraId,
  });
  const complete = picks.length === 11;

  return (
    <section className="draft-board" aria-labelledby="draft-heading">
      <div className="draft-statusbar">
        <div>
          <span className="eyebrow">
            {complete ? "TEAM SHEET COMPLETE" : currentSlot ? "POSITION SELECTED" : "YOUR NEXT MOVE"}
          </span>
          <h1 id="draft-heading">
            {complete
              ? "Your XI awaits history"
              : currentSlot
                ? `Choose your ${currentSlot.label}`
                : "Select any open position"}
          </h1>
        </div>
        <div
          className="draft-progress"
          aria-label={`${picks.length} of 11 players drafted`}
        >
          <div>
            <span style={{ width: `${(picks.length / 11) * 100}%` }} />
          </div>
          <b>{picks.length} / 11</b>
        </div>
        <div className="draft-utilities">
          <span>{manager.managerName} · {formation.name} · {era.years}</span>
          <button
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
            <span className="live-dot">{complete ? "COMPLETE" : "SELECT A SLOT"}</span>
          </div>
          <TacticalPitch
            formation={formation}
            lineup={lineup}
            picks={picks}
            selectedSlotId={selectedSlotId}
            onSelectSlot={selectSlot}
            onInspectPlayer={setInspected}
          />
          <TeamRatings ratings={ratings} expanded />
        </div>

        <div className="draft-choices">
          {complete ? (
            <div className="draft-complete">
              <span className="eyebrow eyebrow--gold">XI SEALED</span>
              <h2>The tunnel is open.</h2>
              <p>
                Eleven unique identities, one tournament manager, and no player
                from the opposing Spain 2010 team.
              </p>
              <Button onClick={() => router.push("/match")}>
                Face the champion <ArrowRight size={17} aria-hidden />
              </Button>
            </div>
          ) : currentSlot ? (
            <>
              <div className="draft-choices__heading">
                <div>
                  <span className="eyebrow eyebrow--gold">ARCHIVE DRAW / 03</span>
                  <h2>Choose your {currentSlot.label}</h2>
                </div>
                <button className="text-button" onClick={cancelSlot}>
                  <X size={14} aria-hidden /> Change position
                </button>
              </div>
              <div className="draft-card-grid" aria-live="polite">
                {options.map((player) => (
                  <motion.div
                    key={`${selectedSlotId}-${player.id}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PlayerCard
                      player={player}
                      onSelect={() => selectPlayer(player.id)}
                      onInspect={() => setInspected(player)}
                      showFit
                      positionFit={getPositionFit(player, currentSlot)}
                      eraFit={calculateEraFit(player, eraId)}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="respin-row">
                <p>
                  <ShieldQuestion size={15} aria-hidden />
                  No duplicate identity · Spain 2010 identities excluded
                </p>
                <button
                  className="button button--secondary"
                  disabled={respinUsed}
                  onClick={() => setShowRespin(true)}
                >
                  <RefreshCw size={15} aria-hidden />
                  {respinUsed
                    ? `Respin used${respinStage ? ` on ${respinStage}` : ""}`
                    : "Use your one respin"}
                </button>
              </div>
            </>
          ) : (
            <div className="slot-prompt">
              <span className="eyebrow eyebrow--gold">THE BOARD IS YOURS</span>
              <h2>Draft in any order.</h2>
              <p>
                Choose an empty node on the pitch. You can cancel before picking,
                inspect every filled card, and never replace a locked player.
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
        {complete
          ? "Draft complete. Continue to the champion match."
          : currentSlot
            ? `Three options generated for ${currentSlot.label}.`
            : `${picks.length} of 11 drafted. Select an open position.`}
      </p>

      {showReset && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <span className="eyebrow eyebrow--gold">RESET DRAFT</span>
            <h2 id="reset-title">Return every player card?</h2>
            <p>Your era, manager, and formation remain. All {picks.length} picks are cleared.</p>
            <div className="dialog__actions">
              <Button variant="secondary" onClick={() => setShowReset(false)} autoFocus>
                Keep drafting
              </Button>
              <Button onClick={() => { resetDraft(); setShowReset(false); }}>
                Reset XI
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRespin && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="respin-title">
            <span className="eyebrow eyebrow--gold">ONE-TIME RESPIN</span>
            <h2 id="respin-title">Reject all three cards?</h2>
            <p>
              These three player identities cannot return. This permanently uses
              the session’s only respin.
            </p>
            <div className="dialog__actions">
              <Button variant="secondary" onClick={() => setShowRespin(false)} autoFocus>
                Keep options
              </Button>
              <Button onClick={() => { respinPlayers(); setShowRespin(false); }}>
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
