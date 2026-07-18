"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChampionReveal } from "@/components/match/champion-reveal";
import { MatchTimeline } from "@/components/match/match-timeline";
import { GameHeader } from "@/components/navigation/game-header";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { playersById } from "@/data/players";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { calculateTeamRatings } from "@/engine/ratings";
import { useGameStore } from "@/store/game-store";
import type { PlayerTournamentCard } from "@/types/game";

const benchSlots = ["bench-1", "bench-2", "bench-3"] as const;

export default function MatchPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const formationId = useGameStore((state) => state.formationId);
  const eraId = useGameStore((state) => state.eraId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const managerId = useGameStore((state) => state.managerId);
  const selectedOpponentId = useGameStore(
    (state) => state.selectedOpponentId,
  );
  const storedResult = useGameStore((state) => state.matchResult);
  const simulate = useGameStore((state) => state.simulate);
  const [broadcasting, setBroadcasting] = useState(Boolean(storedResult));

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
  const bench = useMemo(
    () =>
      benchSlots
        .map((slotId) => {
          const pick = benchPicks.find(
            (candidate) => candidate.slotId === slotId,
          );
          return pick ? playersById.get(pick.cardId) : undefined;
        })
        .filter(
          (player): player is PlayerTournamentCard => player !== undefined,
        ),
    [benchPicks],
  );
  const manager = managerId ? managersById.get(managerId) : undefined;
  const opponent = selectedOpponentId
    ? historicalOpponentsById.get(selectedOpponentId)
    : undefined;
  const ratings =
    formation && manager && eraId
      ? calculateTeamRatings(lineup, formation, {
          picks,
          manager,
          eraId,
          bench,
        })
      : null;

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">PREPARING THE FIXTURE</p>
      </main>
    );
  }

  if (
    !formation ||
    !manager ||
    !opponent ||
    !ratings ||
    !eraId ||
    lineup.length !== 11 ||
    bench.length !== 3
  ) {
    return (
      <div className="game-page">
        <GameHeader step="MATCH" />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">TEAM SHEET INCOMPLETE</span>
          <h1>Fourteen names and an opponent are required.</h1>
          <p>
            Return to the archive, complete the ordered bench, and choose a
            tournament opponent.
          </p>
          <Button onClick={() => router.replace("/play/draft")}>
            Return to squad
          </Button>
        </main>
      </div>
    );
  }

  const result = storedResult;
  const opponentEraFit = calculateOpponentEraFit(opponent, eraId);

  return (
    <div className="game-page game-page--match">
      <GameHeader step={broadcasting ? "MATCH LIVE" : "OPPONENT REVEAL"} />
      <main className="container game-main">
        {broadcasting && result ? (
          <MatchTimeline
            result={result}
            opponent={opponent}
            onSkip={() => router.push("/result")}
          />
        ) : (
          <ChampionReveal
            opponent={opponent}
            userRatings={ratings}
            opponentEraFit={opponentEraFit}
            userEra={`${getDraftEra(eraId).label} environment · ${manager.managerName}`}
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
