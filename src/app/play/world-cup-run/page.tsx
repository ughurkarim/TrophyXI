"use client";

import {
  ArrowRight,
  Crown,
  FastForward,
  Play,
  RotateCcw,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import worldCupImage from "../../../../assets/worldcup2.png";
import groupLossImage from "../../../../assets/world-cup-losses/group.png";
import r32LossImage from "../../../../assets/world-cup-losses/r32.png";
import r16LossImage from "../../../../assets/world-cup-losses/r16.png";
import qfLossImage from "../../../../assets/world-cup-losses/qf.png";
import sfLossImage from "../../../../assets/world-cup-losses/sf.png";
import finalLossImage from "../../../../assets/world-cup-losses/final.png";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { flushSync } from "react-dom";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import {
  getPendingWorldCupRunUserFixture,
  WORLD_CUP_RUN_KNOCKOUT_STAGES,
  type WorldCupRunFixture,
  type WorldCupRunKnockoutStage,
  type WorldCupRunStage,
} from "@/engine/world-cup-run";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import styles from "./world-cup-run.module.css";

const stageLabels: Record<WorldCupRunStage, string> = {
  group: "GROUP STAGE",
  "round-of-32": "ROUND OF 32",
  "round-of-16": "ROUND OF 16",
  "quarter-final": "QUARTERFINAL",
  "semi-final": "SEMIFINAL",
  final: "WORLD CUP FINAL",
  complete: "TOURNAMENT COMPLETE",
};

const ordinal = (value: number) => {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
};

const shortStageLabels: Record<WorldCupRunKnockoutStage, string> = {
  "round-of-32": "R32",
  "round-of-16": "R16",
  "quarter-final": "QF",
  "semi-final": "SF",
  final: "FINAL",
};

const stageOrder: Array<Exclude<WorldCupRunStage, "complete">> = [
  "group",
  ...WORLD_CUP_RUN_KNOCKOUT_STAGES,
];

const lossPresentation: Record<
  Exclude<WorldCupRunStage, "complete">,
  { image: string; eyebrow: string; headline: string }
> = {
  group: {
    image: groupLossImage.src,
    eyebrow: "Tournament over",
    headline: "The World Cup ends in the group stage.",
  },
  "round-of-32": {
    image: r32LossImage.src,
    eyebrow: "Tournament over",
    headline: "The journey ends in the Round of 32.",
  },
  "round-of-16": {
    image: r16LossImage.src,
    eyebrow: "Tournament over",
    headline: "The journey ends in the Round of 16.",
  },
  "quarter-final": {
    image: qfLossImage.src,
    eyebrow: "Tournament over",
    headline: "The dream ends in the quarterfinal.",
  },
  "semi-final": {
    image: sfLossImage.src,
    eyebrow: "Tournament over",
    headline: "The dream ends in the semifinal.",
  },
  final: {
    image: finalLossImage.src,
    eyebrow: "Tournament over",
    headline: "So close to the trophy.",
  },
};

const countryColors = [
  "#4ea8de",
  "#e85d75",
  "#45c486",
  "#ff8f5a",
  "#9d7bea",
  "#f0c84b",
  "#32b8b1",
];

const accentFor = (code: string) =>
  countryColors[
    [...code].reduce((total, character) => total + character.charCodeAt(0), 0) %
      countryColors.length
  ];

const winnerFor = (fixture: WorldCupRunFixture) => {
  if (!fixture.result || fixture.stage === "group") return null;
  if (fixture.result.homeGoals > fixture.result.awayGoals) return fixture.homeTeamId;
  if (fixture.result.awayGoals > fixture.result.homeGoals) return fixture.awayTeamId;
  return fixture.result.penalties![0] > fixture.result.penalties![1]
    ? fixture.homeTeamId
    : fixture.awayTeamId;
};

export default function WorldCupRunPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const gameMode = useGameStore((state) => state.gameMode);
  const eraId = useGameStore((state) => state.eraId);
  const managerId = useGameStore((state) => state.managerId);
  const formationId = useGameStore((state) => state.formationId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const matchResult = useGameStore((state) => state.matchResult);
  const run = useGameStore((state) => state.worldCupRun);
  const startWorldCupRun = useGameStore((state) => state.startWorldCupRun);
  const restartWorldCupRun = useGameStore((state) => state.restartWorldCupRun);
  const continueWorldCupRun = useGameStore((state) => state.continueWorldCupRun);
  const simulateMatch = useGameStore((state) => state.simulateWorldCupRunMatch);
  const simulateGroup = useGameStore((state) => state.simulateWorldCupRunGroup);
  const simulateRound = useGameStore((state) => state.simulateWorldCupRunRound);
  const enterKnockouts = useGameStore((state) => state.enterWorldCupRunKnockouts);
  const [revealedFixtures, setRevealedFixtures] = useState<string[]>([]);
  const [changedTeams, setChangedTeams] = useState<string[]>([]);
  const [teamMovements, setTeamMovements] = useState<
    Record<string, "up" | "down">
  >({});
  const [deferredElimination, setDeferredElimination] = useState(false);
  const [deferredFixtureId, setDeferredFixtureId] = useState<string | null>(null);

  const dismissDeferredElimination = () => {
    setDeferredElimination(false);
    setDeferredFixtureId(null);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (gameMode !== "world-cup-run") router.replace("/play");
    else if (!eraId) router.replace("/play/era");
    else if (!managerId) router.replace("/play/manager");
    else if (!formationId) router.replace("/play/formation");
    else if (picks.length !== 11 || benchPicks.length !== 3) router.replace("/play/draft");
  }, [
    benchPicks.length,
    eraId,
    formationId,
    gameMode,
    hydrated,
    managerId,
    picks.length,
    router,
  ]);

  const teams = useMemo(
    () => new Map(run?.teams.map((team) => [team.id, team]) ?? []),
    [run?.teams],
  );

  const animateQuickSimulation = (action: () => void) => {
    const before = useGameStore.getState().worldCupRun;
    if (!before) return;

    /*
     * Knockout losses use a deliberate result state before the terminal screen.
     * Zustand is an external store, so its update can render before the local
     * deferred-elimination state unless we commit the guard first. That caused
     * the one-frame "wrong screen" flash.
     *
     * Set the guard BEFORE mutating the tournament. It is harmless on wins and
     * gets cleared immediately below when the run remains active.
     */
    if (before.currentStage !== "group" && before.status === "active") {
      const fixtureBeforeSimulation =
        before.currentStage !== "complete"
          ? before.fixtures.find(
              (fixture) =>
                fixture.stage === before.currentStage &&
                [fixture.homeTeamId, fixture.awayTeamId].includes(before.userTeamId),
            )
          : null;

      flushSync(() => {
        setDeferredElimination(true);
        setDeferredFixtureId(fixtureBeforeSimulation?.id ?? null);
      });
    }

    const previousRanks = new Map(
      Object.values(before.standings)
        .flat()
        .map((standing) => [standing.teamId, standing.rank]),
    );
    const previousFixtureIds = new Set(before.history.map((entry) => entry.fixtureId));

    action();

    const after = useGameStore.getState().worldCupRun;
    if (!after) return;

    if (after.status !== "eliminated") {
      setDeferredElimination(false);
      setDeferredFixtureId(null);
    }

    setRevealedFixtures(
      after.history
        .filter((entry) => !previousFixtureIds.has(entry.fixtureId))
        .map((entry) => entry.fixtureId),
    );
    const changed = Object.values(after.standings)
      .flat()
      .filter((standing) => previousRanks.get(standing.teamId) !== standing.rank)
      .map((standing) => standing.teamId);
    setChangedTeams(changed);
    setTeamMovements(
      Object.fromEntries(
        Object.values(after.standings)
          .flat()
          .filter((standing) => changed.includes(standing.teamId))
          .map((standing) => [
            standing.teamId,
            (previousRanks.get(standing.teamId) ?? standing.rank) > standing.rank
              ? "up"
              : "down",
          ]),
      ),
    );
    window.setTimeout(() => {
      setRevealedFixtures([]);
      setChangedTeams([]);
      setTeamMovements({});
    }, 1500);
  };

  if (
    !hydrated ||
    gameMode !== "world-cup-run" ||
    !eraId ||
    !managerId ||
    !formationId ||
    picks.length !== 11 ||
    benchPicks.length !== 3
  ) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">PREPARING THE TOURNAMENT</p>
      </main>
    );
  }

  if (!run) {
    return (
      <div className={`game-page game-page--stadium ${styles.shell}`}>
        <GameHeader step="WORLD CUP RUN" />
        <SaveNotice />
        <main className={`container game-main ${styles.launch}`}>
          <div className={styles.launchBackdrop} aria-hidden>
            <span />
            <span />
            <span />
          </div>

          <section className={styles.launchContent}>
            <div className={styles.launchKicker}>
              <i />
              <p className="eyebrow eyebrow--gold">THE BIGGEST STAGE IN FOOTBALL</p>
              <i />
            </div>

            <h1 className={styles.launchHeadline}>
              ENTER THE
              <span>WORLD CUP</span>
            </h1>

            <div className={styles.launchMeta} aria-label="World Cup overview">
              <span>48 NATIONS</span>
              <i />
              <span>ONE TROPHY</span>
              <i />
              <span>YOUR RUN STARTS NOW</span>
            </div>

            <div className={styles.launchActions}>
              <Button onClick={startWorldCupRun}>
                BEGIN THE WORLD CUP <ArrowRight size={16} aria-hidden />
              </Button>
            </div>
          </section>

          <section className={styles.launchVisual} aria-label="World Cup trophy presentation">
            <div className={styles.prizeEyebrow}>
              <i />
              <span>THE ULTIMATE PRIZE</span>
              <i />
            </div>

            <div className={styles.trophyStage}>
              <div className={styles.trophyGlow} aria-hidden />
              <div className={styles.trophyAura} aria-hidden />
              <img
                src={worldCupImage.src}
                alt="World Cup trophy"
                className={styles.worldCupImage}
              />
            </div>
          </section>
        </main>
      </div>
    );
  }

  const userGroup = run.groups.find((group) => group.teamIds.includes(run.userTeamId))!;
  const groupStandings = run.standings[userGroup.id];
  const userStanding = groupStandings.find((standing) => standing.teamId === run.userTeamId)!;
  const nextFixture = getPendingWorldCupRunUserFixture(run);
  const nextOpponentId = nextFixture
    ? nextFixture.homeTeamId === run.userTeamId
      ? nextFixture.awayTeamId
      : nextFixture.homeTeamId
    : null;
  const userGroupFixtures = run.fixtures.filter((fixture) => fixture.groupId === userGroup.id);
  const userGroupRoad = userGroupFixtures
    .filter((fixture) => [fixture.homeTeamId, fixture.awayTeamId].includes(run.userTeamId))
    .sort(
      (a, b) =>
        (a.matchday ?? Number.MAX_SAFE_INTEGER) -
        (b.matchday ?? Number.MAX_SAFE_INTEGER),
    );
  const unresolvedGroupFixtures = userGroupFixtures.filter((fixture) => !fixture.result);
  const groupStageComplete = run.fixtures
    .filter((fixture) => fixture.stage === "group")
    .every((fixture) => Boolean(fixture.result));

  const automaticQualifierIds = Object.values(run.standings).flatMap((standings) =>
    standings.slice(0, 2).map((standing) => standing.teamId),
  );

  const rankedBestThirdIds = Object.values(run.standings)
    .map((standings) => standings[2])
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        second.goalsFor - first.goalsFor ||
        first.deterministicTiebreak - second.deterministicTiebreak,
    )
    .slice(0, 8)
    .map((standing) => standing.teamId);

  const actualQualifierIds = [...automaticQualifierIds, ...rankedBestThirdIds];
  if (!actualQualifierIds.includes(run.finalBossTeamId)) {
    const replacementIndex = actualQualifierIds.findLastIndex(
      (teamId) => teamId !== run.userTeamId,
    );
    if (replacementIndex >= 0) actualQualifierIds[replacementIndex] = run.finalBossTeamId;
  }

  const bestThirdQualifierIds = new Set(
    groupStageComplete
      ? actualQualifierIds.filter((teamId) =>
          Object.values(run.standings).some(
            (standings) =>
              standings[2]?.teamId === teamId &&
              standings[2]?.rank === 3,
          ),
        )
      : [],
  );

  const knockoutView = run.currentStage !== "group";
  const userCurrentFixture =
    run.currentStage !== "group" && run.currentStage !== "complete"
      ? run.fixtures.find(
          (fixture) =>
            fixture.stage === run.currentStage &&
            [fixture.homeTeamId, fixture.awayTeamId].includes(run.userTeamId),
        )
      : null;

  const deferredUserFixture =
    deferredElimination && deferredFixtureId
      ? run.fixtures.find((fixture) => fixture.id === deferredFixtureId) ?? null
      : null;

  /*
   * SIMULATE ROUND can advance run.currentStage even when Trophy XI lost in
   * that round. Keep showing the fixture Trophy XI actually just played until
   * the user presses NEXT.
   */
  const routeFixture = deferredUserFixture ?? userCurrentFixture;
  const displayStage =
    deferredElimination && deferredUserFixture
      ? deferredUserFixture.stage
      : run.currentStage;
  const currentStageIndex =
    displayStage === "complete" ? stageOrder.length : stageOrder.indexOf(displayStage);

  const currentRoundPending =
    run.currentStage !== "complete" &&
    run.fixtures.some((fixture) => fixture.stage === run.currentStage && !fixture.result);
  const finalOpponent = nextOpponentId ? teams.get(nextOpponentId) : null;

  const finalElimination =
    run.status === "eliminated" &&
    (run.currentStage === "complete" || run.eliminatedStage === "final");
  const tournamentOver =
    run.status === "eliminated" && (finalElimination || !deferredElimination);
  const userLostCurrentFixture = Boolean(
    routeFixture?.result && winnerFor(routeFixture) !== run.userTeamId,
  );
  const qualifiedAsBestThird =
    run.qualificationStatus === "qualified" &&
    userStanding.rank === 3 &&
    bestThirdQualifierIds.has(run.userTeamId);
  const champion = run.championTeamId ? teams.get(run.championTeamId) : null;
  const eliminatedStage = (run.eliminatedStage ?? "group") as Exclude<
    WorldCupRunStage,
    "complete"
  >;
  const lossScreen = lossPresentation[eliminatedStage];

  return (
    <div className={`game-page game-page--stadium ${styles.shell}`}>
      <GameHeader step="WORLD CUP RUN" />
      <SaveNotice />
      <main
        className={`container ${styles.main}`}
        data-knockout={run.currentStage !== "group"}
      >
        <header
          className={styles.header}
          data-knockout={run.currentStage !== "group"}
        >
          <div className={styles.titleLockup}>
            {run.currentStage === "group" && (
              <span className={styles.cupMark} aria-hidden>
                <Trophy size={19} />
              </span>
            )}
            <div>
              <p className="eyebrow eyebrow--gold">
                {run.currentStage === "group"
                  ? `WORLD CUP RUN · GROUP ${userGroup.id}`
                  : "WORLD CUP RUN · KNOCKOUT"}
              </p>
              {run.currentStage === "group" && (
                <h1>{stageLabels[run.currentStage]}</h1>
              )}
            </div>
          </div>
          <div className={styles.headerStatus} data-status={run.status}>
            <span>
              {qualifiedAsBestThird && run.currentStage === "group"
                ? "KNOCKOUT PLACE SECURED"
                : run.status === "active"
                  ? "LIVE TOURNAMENT"
                  : run.status.toUpperCase()}
            </span>
            <b>
              {run.currentStage === "group"
                ? run.qualificationStatus === "pending"
                  ? `${userStanding.rank}${userStanding.rank === 1 ? "ST" : userStanding.rank === 2 ? "ND" : userStanding.rank === 3 ? "RD" : "TH"} IN GROUP`
                  : qualifiedAsBestThird
                    ? "QUALIFIED · BEST 3RD"
                    : run.qualificationStatus.toUpperCase()
                : stageLabels[run.currentStage]}
            </b>
          </div>
          <button
            className={styles.restart}
            type="button"
            onClick={() => {
              if (window.confirm("Restart this tournament with a new field?")) restartWorldCupRun();
            }}
          >
            <RotateCcw size={14} aria-hidden /> RESTART
          </button>
        </header>

        <nav className={styles.progress} aria-label="Tournament progress">
          {stageOrder.map((stage, index) => (
            <div
              key={stage}
              data-active={stage === displayStage}
              data-complete={index < currentStageIndex}
            >
              <span>{index + 1}</span>
              <b>{stage === "group" ? "GROUPS" : shortStageLabels[stage]}</b>
            </div>
          ))}
        </nav>

        {tournamentOver ? (
          <section
            className={`${styles.terminal} ${styles.lossState}`}
            data-stage={eliminatedStage}
          >
            <div className={styles.lossAtmosphere} aria-hidden />
            <div className={styles.lossCopy}>
              <p className={styles.lossEyebrow}>{lossScreen.eyebrow}</p>
              <h2>{lossScreen.headline}</h2>
              <p className={styles.lossBody}>
                {eliminatedStage === "group"
                  ? `Trophy XI finished ${ordinal(userStanding.rank)} in Group ${userGroup.id}. Your squad and tournament record remain saved.`
                  : eliminatedStage === "final"
                    ? (() => {
                        const finalFixture = run.fixtures.find(
                          (fixture) =>
                            fixture.stage === "final" &&
                            [fixture.homeTeamId, fixture.awayTeamId].includes(run.userTeamId),
                        );

                        if (!finalFixture?.result?.penalties) {
                          return "The final hurdle proves one step too far. Your squad and tournament record remain saved.";
                        }

                        const userAtHome = finalFixture.homeTeamId === run.userTeamId;
                        const userPenalties = userAtHome
                          ? finalFixture.result.penalties[0]
                          : finalFixture.result.penalties[1];
                        const opponentPenalties = userAtHome
                          ? finalFixture.result.penalties[1]
                          : finalFixture.result.penalties[0];

                        return `Trophy XI fall ${userPenalties}–${opponentPenalties} on penalties. Your squad and tournament record remain saved.`;
                      })()
                    : "A memorable World Cup run comes to a close. Your squad and tournament record remain saved."}
              </p>

              <div className={styles.lossActions}>
                <Button onClick={() => router.push("/play")}>Return to menu</Button>
                <Button variant="secondary" onClick={restartWorldCupRun}>
                  <RotateCcw size={15} /> Restart World Cup
                </Button>
              </div>
            </div>

            <div className={styles.lossVisual} aria-hidden>
              <div className={styles.lossVisualGlow} />
              <img
                src={lossScreen.image}
                alt=""
                className={styles.lossPlayer}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </section>
        ) : run.status === "champion" ? (
          <section className={`${styles.terminal} ${styles.championState}`}>
            <span className={styles.terminalIcon}><Crown size={30} /></span>
            <p className="eyebrow eyebrow--gold">WORLD CHAMPIONS</p>
            <h2>Trophy XI have conquered the world.</h2>
            <p>The trophy is yours after surviving every stage of the tournament.</p>
            <div>
              {matchResult && (
                <Button onClick={() => router.push("/result")}>VIEW FINAL RECORD</Button>
              )}
              <Button variant="secondary" onClick={() => router.push("/play")}>RETURN TO MAIN SCREEN</Button>
            </div>
          </section>
        ) : !knockoutView ? (
          <div className={styles.groupDashboard}>
            <div className={styles.groupPrimaryRail}>
              <section className={`${styles.panel} ${styles.nextPanel}`}>
                <div className={styles.panelTopline}>
                  <span><Zap size={13} /> NEXT FIXTURE</span>
                  <b>{nextFixture ? `MATCHDAY ${nextFixture.matchday}` : "GROUP COMPLETE"}</b>
                </div>
                {nextFixture && nextOpponentId ? (
                  <div className={styles.fixtureHero}>
                    <TeamIdentity team={teams.get(run.userTeamId)!} home />
                    <div className={styles.versus}><span>VS</span><small>GROUP {userGroup.id}</small></div>
                    <TeamIdentity team={teams.get(nextOpponentId)!} />
                  </div>
                ) : (
                  <div className={styles.qualifiedHero}>
                    <div className={styles.qualifiedHeroContent}>
                      <p className="eyebrow eyebrow--gold">
                        {run.status === "eliminated"
                          ? "GROUP COMPLETE"
                          : qualifiedAsBestThird
                            ? "BEST THIRD-PLACE QUALIFIER"
                            : "GROUP QUALIFIED"}
                      </p>
                      <h2>
                        {run.status === "eliminated"
                          ? "The final scores are in."
                          : qualifiedAsBestThird
                            ? "Third place is through."
                            : "The knockout road is open."}
                      </h2>
                      {qualifiedAsBestThird && (
                        <span className={styles.thirdPlaceNotice}>
                          <b>3RD</b>
                          <span>ONE OF THE 8 BEST THIRD-PLACE TEAMS</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className={styles.quickActions}>
                  {run.status === "eliminated" && deferredElimination ? (
                    <Button onClick={dismissDeferredElimination}>
                      NEXT <ArrowRight size={15} />
                    </Button>
                  ) : run.qualificationStatus === "qualified" ? (
                    <Button onClick={enterKnockouts}>
                      ENTER ROUND OF 32 <ArrowRight size={15} />
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => animateQuickSimulation(simulateMatch)}
                        disabled={!nextFixture}
                      >
                        <Play size={14} fill="currentColor" /> SIMULATE MATCH
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => animateQuickSimulation(simulateGroup)}
                      >
                        <Users size={15} /> SIMULATE GROUP
                      </Button>
                    </>
                  )}
                </div>
              </section>

              <section className={`${styles.panel} ${styles.groupRoadPanel}`}>
                <div className={styles.panelTopline}>
                  <span>ROAD TO THE KNOCKOUTS</span>
                  <b>3 GROUP MATCHES</b>
                </div>
                <div className={styles.groupRoad}>
                  {userGroupRoad.map((fixture) => {
                    const opponentId =
                      fixture.homeTeamId === run.userTeamId
                        ? fixture.awayTeamId
                        : fixture.homeTeamId;
                    const opponent = teams.get(opponentId)!;
                    const isNext = nextFixture?.id === fixture.id;

                    let roadState = "upcoming";
                    let roadLabel = isNext ? "NEXT" : "UPCOMING";

                    if (fixture.result) {
                      const userGoals =
                        fixture.homeTeamId === run.userTeamId
                          ? fixture.result.homeGoals
                          : fixture.result.awayGoals;
                      const opponentGoals =
                        fixture.homeTeamId === run.userTeamId
                          ? fixture.result.awayGoals
                          : fixture.result.homeGoals;

                      roadState =
                        userGoals > opponentGoals
                          ? "win"
                          : userGoals < opponentGoals
                            ? "loss"
                            : "draw";
                      roadLabel =
                        roadState === "win" ? "W" : roadState === "loss" ? "L" : "D";
                    }

                    return (
                      <div
                        key={fixture.id}
                        className={styles.groupRoadStep}
                        data-current={isNext}
                        data-complete={Boolean(fixture.result)}
                        title={opponent.name}
                      >
                        <small>MD {fixture.matchday}</small>
                        <span>{flagForCountry(opponent.countryCode)}</span>
                        <strong>{opponent.countryCode}</strong>
                        <i data-result={roadState}>{roadLabel}</i>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className={`${styles.panel} ${styles.standingsPanel}`}>
              <div className={styles.panelTopline}>
                <span>GROUP {userGroup.id} · STANDINGS</span>
                <b>TOP 2 + BEST 3RDS ADVANCE</b>
              </div>
              <div className={styles.tableHead}>
                <span>POS</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span>
              </div>
              <div className={styles.tableBody}>
                {groupStandings.map((standing, index) => {
                  const team = teams.get(standing.teamId)!;
                  const isBestThirdQualifier =
                    standing.rank === 3 &&
                    bestThirdQualifierIds.has(standing.teamId);

                  return (
                    <Fragment key={standing.teamId}>
                      {index === 2 && (
                        <div
                          className={styles.autoQualificationBreak}
                          aria-label="Automatic qualification line"
                        >
                          <span />
                          <b>AUTOMATIC QUALIFICATION</b>
                          <span />
                        </div>
                      )}
                      <div
                        className={styles.tableRow}
                        data-user={standing.teamId === run.userTeamId}
                        data-changed={changedTeams.includes(standing.teamId)}
                        data-movement={teamMovements[standing.teamId]}
                        data-qualified={standing.rank <= 2 || isBestThirdQualifier}
                        data-best-third={isBestThirdQualifier}
                      >
                        <b>{standing.rank}</b>
                        <span className={styles.tableTeam}>
                          <i>{flagForCountry(team.countryCode)}</i>
                          <strong>{team.name}</strong>
                          <small className={isBestThirdQualifier ? styles.bestThirdTag : ""}>
                            {isBestThirdQualifier ? "BEST 3RD · THROUGH" : team.countryCode}
                          </small>
                        </span>
                        <span>{standing.played}</span>
                        <span>{standing.goalDifference > 0 ? "+" : ""}{standing.goalDifference}</span>
                        <b>{standing.points}</b>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.fixturesPanel}`}>
              <div className={styles.panelTopline}>
                <span>GROUP {userGroup.id} · FIXTURES</span>
                <b>{unresolvedGroupFixtures.length} REMAINING</b>
              </div>
              <div className={styles.fixtureList}>
                {userGroupFixtures.map((fixture) => (
                  <CompactFixture
                    key={fixture.id}
                    fixture={fixture}
                    teams={teams}
                    revealed={revealedFixtures.includes(fixture.id)}
                    userTeamId={run.userTeamId}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.knockoutDashboard}>
            <section className={`${styles.panel} ${styles.routePanel}`}>
              <div>
                <p className="eyebrow eyebrow--gold">
                  {displayStage === "final" ? "THE CHAMPIONSHIP MATCH" : "TROPHY XI ROUTE"}
                </p>
                <h2>
                  {userLostCurrentFixture
                    ? "THE RUN ENDS HERE"
                    : displayStage === "final"
                      ? "ONE MATCH. ONE TROPHY."
                      : routeFixture?.result
                        ? "ADVANCEMENT SECURED"
                        : `${stageLabels[displayStage]} MATCH`}
                </h2>
              </div>
              {routeFixture && (
                <div className={styles.routeFixture}>
                  <div
                    className={styles.routeTeam}
                    data-user={routeFixture.homeTeamId === run.userTeamId}
                  >
                    <span>
                      {flagForCountry(teams.get(routeFixture.homeTeamId)!.countryCode)}
                      <strong>{teams.get(routeFixture.homeTeamId)!.name}</strong>
                    </span>
                    <small>
                      {teams.get(routeFixture.homeTeamId)!.countryCode}
                      <i>·</i>
                      <b>{teams.get(routeFixture.homeTeamId)!.rating} OVR</b>
                    </small>
                  </div>

                  <div className={styles.routeResult}>
                    <b className={styles.routeScore}>
                      {routeFixture.result
                        ? `${routeFixture.result.homeGoals} – ${routeFixture.result.awayGoals}`
                        : "VS"}
                    </b>
                    {(() => {
                      const penalties = routeFixture.result?.penalties;
                      if (!penalties) {
                        return (
                          <span
                            className={styles.routePenaltyResult}
                            data-empty="true"
                            aria-hidden
                          >
                            NO SHOOTOUT
                          </span>
                        );
                      }

                      const userAtHome =
                        routeFixture.homeTeamId === run.userTeamId;
                      const userPenalties = userAtHome
                        ? penalties[0]
                        : penalties[1];
                      const opponentPenalties = userAtHome
                        ? penalties[1]
                        : penalties[0];
                      const wonShootout =
                        winnerFor(routeFixture) === run.userTeamId;

                      return (
                        <span
                          className={styles.routePenaltyResult}
                          data-result={wonShootout ? "win" : "loss"}
                          aria-label={`${wonShootout ? "Won" : "Lost"} ${userPenalties}–${opponentPenalties} on penalties`}
                        >
                          ({userPenalties}–{opponentPenalties})
                        </span>
                      );
                    })()}
                  </div>

                  <div
                    className={styles.routeTeam}
                    data-user={routeFixture.awayTeamId === run.userTeamId}
                  >
                    <span>
                      {flagForCountry(teams.get(routeFixture.awayTeamId)!.countryCode)}
                      <strong>{teams.get(routeFixture.awayTeamId)!.name}</strong>
                    </span>
                    <small>
                      {teams.get(routeFixture.awayTeamId)!.countryCode}
                      <i>·</i>
                      <b>{teams.get(routeFixture.awayTeamId)!.rating} OVR</b>
                    </small>
                  </div>
                </div>
              )}
              <div className={styles.quickActions}>
                {run.status === "eliminated" && deferredElimination ? (
                  <Button
                    className={styles.nextAction}
                    onClick={dismissDeferredElimination}
                  >
                    NEXT <ArrowRight size={15} />
                  </Button>
                ) : run.currentStage === "final" && nextFixture && finalOpponent ? (
                  <Button
                    className={styles.championshipAction}
                    onClick={() => {
                      continueWorldCupRun();
                      router.push("/match");
                    }}
                  >
                    ENTER CHAMPIONSHIP MATCH <ArrowRight size={15} />
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => animateQuickSimulation(simulateMatch)}
                      disabled={!nextFixture}
                    >
                      <Play size={14} fill="currentColor" /> SIMULATE MATCH
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => animateQuickSimulation(simulateRound)}
                      disabled={!currentRoundPending}
                    >
                      <FastForward size={15} fill="currentColor" /> SIMULATE ROUND
                    </Button>
                  </>
                )}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.bracketPanel}`}>
              <div className={styles.bracketHeading}>
                <div>
                  <p className="eyebrow">FULL KNOCKOUT BRACKET</p>
                  <h3>The road to the World Cup Final</h3>
                </div>
                <span><i /> TROPHY XI PATH · FULL BRACKET</span>
              </div>
              <FullBracket
                fixtures={run.fixtures}
                teams={teams}
                userTeamId={run.userTeamId}
                revealedFixtures={revealedFixtures}
              />
            </section>
          </div>
        )}

        {run.currentStage === "complete" && run.status !== "champion" && !tournamentOver && (
          <p>{champion?.name ?? "The champion"} lifts the trophy.</p>
        )}
      </main>
    </div>
  );
}

type Team = {
  id: string;
  name: string;
  countryCode: string;
  rating: number;
};

function TeamIdentity({ team, home = false }: { team: Team; home?: boolean }) {
  return (
    <div
      className={styles.teamIdentity}
      data-home={home}
      style={{ "--nation-accent": accentFor(team.countryCode) } as CSSProperties}
    >
      <span>{flagForCountry(team.countryCode)}</span>
      <div>
        <strong>{team.name}</strong>
        <small>
          <span>{team.countryCode}</span>
          <b>{team.rating} OVR</b>
        </small>
      </div>
    </div>
  );
}

function CompactFixture({
  fixture,
  teams,
  revealed,
  userTeamId,
}: {
  fixture: WorldCupRunFixture;
  teams: Map<string, Team>;
  revealed: boolean;
  userTeamId: string;
}) {
  const home = teams.get(fixture.homeTeamId)!;
  const away = teams.get(fixture.awayTeamId)!;
  return (
    <article
      className={styles.compactFixture}
      data-revealed={revealed}
      data-user={[fixture.homeTeamId, fixture.awayTeamId].includes(userTeamId)}
    >
      <small>MD {fixture.matchday}</small>
      <span data-user-team={home.id === userTeamId}>
        {flagForCountry(home.countryCode)} {home.name}
      </span>
      <b>{fixture.result ? `${fixture.result.homeGoals}–${fixture.result.awayGoals}` : "—"}</b>
      <span data-user-team={away.id === userTeamId}>
        {flagForCountry(away.countryCode)} {away.name}
      </span>
    </article>
  );
}

const previousKnockoutStage: Partial<
  Record<WorldCupRunKnockoutStage, WorldCupRunKnockoutStage>
> = {
  "round-of-16": "round-of-32",
  "quarter-final": "round-of-16",
  "semi-final": "quarter-final",
  final: "semi-final",
};

function FullBracket({
  fixtures,
  teams,
  userTeamId,
  revealedFixtures,
}: {
  fixtures: WorldCupRunFixture[];
  teams: Map<string, Team>;
  userTeamId: string;
  revealedFixtures: string[];
}) {
  const fixtureFor = (stage: WorldCupRunKnockoutStage, index: number) =>
    fixtures.filter((fixture) => fixture.stage === stage)[index];

  const renderRound = (
    stage: WorldCupRunKnockoutStage,
    indices: number[],
    side: "left" | "right",
  ) => (
    <section className={styles.bracketRound} data-side={side} data-stage={stage}>
      <header>
        <b>{shortStageLabels[stage]}</b>
        <span>{stageLabels[stage]}</span>
      </header>
      <div className={styles.bracketRoundMatches}>
        {indices.map((index) => (
          <BracketSlot
            key={`${stage}-${index}`}
            stage={stage}
            index={index}
            fixture={fixtureFor(stage, index)}
            teams={teams}
            userTeamId={userTeamId}
            side={side}
            revealed={Boolean(
              fixtureFor(stage, index) &&
                revealedFixtures.includes(fixtureFor(stage, index)!.id),
            )}
          />
        ))}
      </div>
    </section>
  );

  const finalFixture = fixtureFor("final", 0);
  return (
  <div
    className={styles.fullBracket}
    aria-label="Full World Cup knockout bracket"
  >
    {renderRound("round-of-32", [0, 1, 2, 3, 4, 5, 6, 7], "left")}
    {renderRound("round-of-16", [0, 1, 2, 3], "left")}
    {renderRound("quarter-final", [0, 1], "left")}
    {renderRound("semi-final", [0], "left")}

    <section className={styles.finalColumn}>
      <header>
        <b>FINAL</b>
        <span>THE DECIDER</span>
      </header>

      <div
        className={styles.finalStage}
        data-ready={Boolean(finalFixture)}
      >
        <div className={styles.finalTrophyPresentation} aria-hidden>
          <div className={styles.finalTrophyHalo} />
          <div className={styles.finalTrophyBaseGlow} />
          <img
            src={worldCupImage.src}
            alt=""
            className={styles.finalTrophyImage}
          />
        </div>

        <BracketSlot
          stage="final"
          index={0}
          fixture={finalFixture}
          teams={teams}
          userTeamId={userTeamId}
          side="center"
          revealed={Boolean(
            finalFixture && revealedFixtures.includes(finalFixture.id),
          )}
        />

        <small>WINNER LIFTS THE WORLD CUP</small>
      </div>
    </section>

    {renderRound("semi-final", [1], "right")}
    {renderRound("quarter-final", [2, 3], "right")}
    {renderRound("round-of-16", [4, 5, 6, 7], "right")}
    {renderRound(
      "round-of-32",
      [8, 9, 10, 11, 12, 13, 14, 15],
      "right",
    )}
  </div>
);
}

function BracketSlot({
  stage,
  index,
  fixture,
  teams,
  userTeamId,
  side,
  revealed,
}: {
  stage: WorldCupRunKnockoutStage;
  index: number;
  fixture?: WorldCupRunFixture;
  teams: Map<string, Team>;
  userTeamId: string;
  side: "left" | "center" | "right";
  revealed: boolean;
}) {
  const previousStage = previousKnockoutStage[stage];
  const firstFeeder = index * 2 + 1;
  const involvesUser = Boolean(
    fixture && [fixture.homeTeamId, fixture.awayTeamId].includes(userTeamId),
  );
  const userAdvanced = Boolean(
    fixture?.result && winnerFor(fixture) === userTeamId,
  );

  return (
    <div
      className={styles.bracketSlot}
      data-side={side}
      data-user={involvesUser}
      data-user-advanced={userAdvanced}
    >
      {fixture ? (
        <BracketFixture
          fixture={fixture}
          index={index}
          teams={teams}
          userTeamId={userTeamId}
          revealed={revealed}
        />
      ) : (
        <article className={styles.bracketPlaceholder}>
          <small>MATCH {String(index + 1).padStart(2, "0")}</small>
          <div><span>◇</span><strong>Winner {shortStageLabels[previousStage!]} M{firstFeeder}</strong><b>–</b></div>
          <div><span>◇</span><strong>Winner {shortStageLabels[previousStage!]} M{firstFeeder + 1}</strong><b>–</b></div>
        </article>
      )}
    </div>
  );
}

function BracketFixture({
  fixture,
  index,
  teams,
  userTeamId,
  revealed,
}: {
  fixture: WorldCupRunFixture;
  index: number;
  teams: Map<string, Team>;
  userTeamId: string;
  revealed: boolean;
}) {
  const home = teams.get(fixture.homeTeamId)!;
  const away = teams.get(fixture.awayTeamId)!;
  const winner = winnerFor(fixture);
  const involvesUser = [fixture.homeTeamId, fixture.awayTeamId].includes(userTeamId);
  return (
    <article
      className={styles.bracketFixture}
      data-user={involvesUser}
      data-revealed={revealed}
      style={{ "--nation-accent": accentFor(away.countryCode) } as CSSProperties}
    >
      <small>MATCH {String(index + 1).padStart(2, "0")}</small>
      <div data-winner={winner === home.id} data-eliminated={Boolean(winner && winner !== home.id)}>
        <span>{flagForCountry(home.countryCode)}</span>
        <strong>{home.name}</strong>
        <b>{fixture.result?.homeGoals ?? "–"}</b>
      </div>
      <div data-winner={winner === away.id} data-eliminated={Boolean(winner && winner !== away.id)}>
        <span>{flagForCountry(away.countryCode)}</span>
        <strong>{away.name}</strong>
        <b>{fixture.result?.awayGoals ?? "–"}</b>
      </div>
      {fixture.result?.penalties && (
        <em>PEN {fixture.result.penalties[0]}–{fixture.result.penalties[1]}</em>
      )}
    </article>
  );
}