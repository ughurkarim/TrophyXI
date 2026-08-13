"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { calculateTeamRatings } from "@/engine/ratings";
import { useGameStore } from "@/store/game-store";
import type { PlayerTournamentCard } from "@/types/game";

const benchSlots = ["bench-1", "bench-2", "bench-3"] as const;

function MatchPageContent() {
  const router = useRouter();
  const t = useTranslations("matches");
  const eraT = useTranslations("gameSetup.era.options");
  const searchParams = useSearchParams();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const gameMode = useGameStore((state) => state.gameMode);
  const formationId = useGameStore((state) => state.formationId);
  const eraId = useGameStore((state) => state.eraId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const managerId = useGameStore((state) => state.managerId);
  const selectedOpponentId = useGameStore(
    (state) => state.selectedOpponentId,
  );
  const storedResult = useGameStore((state) => state.matchResult);
  const worldCupRunOpponents = useGameStore(
    (state) => state.worldCupRunOpponents,
  );
  const simulate = useGameStore((state) => state.simulate);
  const [broadcasting, setBroadcasting] = useState(false);
  const replayStarted = useRef(false);
  const replayRequested =
    gameMode === "classic-draft" && searchParams.get("replay") === "1";
  const broadcastActive =
    broadcasting || (!replayRequested && Boolean(storedResult));

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
  const opponent = useMemo(() => {
    if (!selectedOpponentId) return undefined;
    const selected =
      worldCupRunOpponents.find(
        (candidate) => candidate.id === selectedOpponentId,
      ) ?? historicalOpponentsById.get(selectedOpponentId);
    return selected?.kind === "all-stars"
      ? resolveWorldCupAllStars(
          [...lineup, ...bench].map((player) => player.playerIdentityId),
        )
      : selected;
  }, [bench, lineup, selectedOpponentId, worldCupRunOpponents]);
  const ratings =
    formation && manager && eraId
      ? calculateTeamRatings(lineup, formation, {
          picks,
          manager,
          eraId,
          bench,
        })
      : null;

  useEffect(() => {
    if (
      !replayRequested ||
      replayStarted.current ||
      !hydrated ||
      !formation ||
      !manager ||
      !opponent ||
      !ratings ||
      !eraId ||
      lineup.length !== 11 ||
      bench.length !== 3
    ) {
      return;
    }

    replayStarted.current = true;
    simulate();
    setBroadcasting(true);
    router.replace("/match");
  }, [
    bench.length,
    eraId,
    formation,
    hydrated,
    lineup.length,
    manager,
    opponent,
    ratings,
    replayRequested,
    router,
    simulate,
  ]);

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">{t("preparingFixture")}</p>
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
        <GameHeader step={t("match")} />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">{t("incomplete")}</span>
          <h1>{t("incompleteTitle")}</h1>
          <p>{t("incompleteDescription")}</p>
          <Button
            onClick={() =>
              router.replace(
                gameMode === "free-selection"
                  ? "/play/free-selection"
                  : gameMode === "world-cup-run"
                    ? "/play/world-cup-run"
                    : "/play/draft",
              )
            }
          >
            {t("returnSquad")}
          </Button>
        </main>
      </div>
    );
  }

  const result = replayRequested && !broadcasting ? null : storedResult;
  const opponentEraFit = calculateOpponentEraFit(opponent, eraId);

  return (
    <div className="game-page game-page--match">
      <GameHeader step={broadcastActive ? t("live") : t("reveal")} />
      <main className="container game-main">
        {replayRequested && !result ? (
          <div className="loading-state" aria-live="polite">
            <div className="loading-emblem" />
            <p className="eyebrow">{t("preparingNew")}</p>
          </div>
        ) : broadcastActive && result ? (
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
            userEra={eraT(`${getDraftEra(eraId).id}.label`)}
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

function MatchPageFallback() {
  const t = useTranslations("matches");
  return (
    <main className="game-page loading-state">
      <div className="loading-emblem" />
      <p className="eyebrow">{t("preparingFixture")}</p>
    </main>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<MatchPageFallback />}>
      <MatchPageContent />
    </Suspense>
  );
}
