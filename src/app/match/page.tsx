"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChampionReveal } from "@/components/match/champion-reveal";
import { MatchTimeline } from "@/components/match/match-timeline";
import { GameHeader } from "@/components/navigation/game-header";
import { Button } from "@/components/ui/button";
import { spain2010 } from "@/data/champions";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import { calculateTeamRatings } from "@/engine/ratings";
import { useGameStore } from "@/store/game-store";
import type { PlayerTournamentCard } from "@/types/game";

export default function MatchPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const formationId = useGameStore((state) => state.formationId);
  const eraId = useGameStore((state) => state.eraId);
  const picks = useGameStore((state) => state.picks);
  const managerId = useGameStore((state) => state.managerId);
  const storedResult = useGameStore((state) => state.matchResult);
  const simulate = useGameStore((state) => state.simulate);
  const [broadcasting, setBroadcasting] = useState(false);

  const formation = formationId ? getFormation(formationId) : null;
  const lineup = useMemo(
    () =>
      formation
        ? formation.slots
            .map((slot) => {
              const pick = picks.find((candidate) => candidate.slotId === slot.id);
              return pick ? playersById.get(pick.cardId) : undefined;
            })
            .filter(
              (player): player is PlayerTournamentCard => player !== undefined,
            )
        : [],
    [formation, picks],
  );
  const manager = managerId ? managersById.get(managerId) : undefined;
  const ratings = formation
    ? calculateTeamRatings(lineup, formation, {
        picks,
        manager,
        eraId: eraId ?? "all",
      })
    : {
        attack: 0,
        midfield: 0,
        defense: 0,
        chemistry: 0,
        positionFit: 0,
        eraFit: 0,
        managerFit: 0,
        overall: 0,
      };

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">PREPARING THE FIXTURE</p>
      </main>
    );
  }

  if (!formation || !manager || lineup.length !== 11) {
    return (
      <div className="game-page">
        <GameHeader step="MATCH" />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">TEAM SHEET INCOMPLETE</span>
          <h1>Eleven names are required.</h1>
          <p>Return to the archive and complete your draft before entering the tunnel.</p>
          <Button onClick={() => router.replace("/play/draft")}>Return to draft</Button>
        </main>
      </div>
    );
  }

  const result = storedResult;

  return (
    <div className="game-page game-page--match">
      <GameHeader step={broadcasting ? "MATCH LIVE" : "CHAMPION REVEAL"} />
      <main className="container game-main">
        {broadcasting && result ? (
          <MatchTimeline
            result={result}
            opponent={spain2010}
            onSkip={() => router.push("/result")}
          />
        ) : (
          <ChampionReveal
            opponent={spain2010}
            userRatings={ratings}
            userEra={`${getDraftEra(eraId ?? "all").years} · ${manager.managerName}`}
            onSimulate={() => {
              simulate();
              setBroadcasting(true);
            }}
          />
        )}
      </main>
    </div>
  );
}
