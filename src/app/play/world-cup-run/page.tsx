"use client";

import {
  ArrowLeft,
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
import { useTranslations } from "next-intl";
import backgroundWorldCupImage from "../../../../assets/backgroundwc.png";
import worldCupImage from "../../../../assets/worldcup2.png";
import winImage from "../../../../assets/win.png";
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
import type { PenaltyShootoutKick } from "@/types/game";
import styles from "./world-cup-run.module.css";
import { getMobileTournamentProgressStage } from "./world-cup-run-presentation";
import { useLocalizedContent } from "@/i18n/content";

const stageLabels: Record<WorldCupRunStage, string> = {
  group: "GROUP STAGE",
  "round-of-32": "ROUND OF 32",
  "round-of-16": "ROUND OF 16",
  "quarter-final": "QUARTERFINAL",
  "semi-final": "SEMIFINAL",
  final: "WORLD CUP FINAL",
  complete: "TOURNAMENT COMPLETE",
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

type ShootoutPresentation = {
  kicks: PenaltyShootoutKick[];
  opponentName: string;
  finalScore: [number, number];
  userWon: boolean;
};

export default function WorldCupRunPage() {
  const router = useRouter();
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const gameMode = useGameStore((state) => state.gameMode);
  const eraId = useGameStore((state) => state.eraId);
  const managerId = useGameStore((state) => state.managerId);
  const formationId = useGameStore((state) => state.formationId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const run = useGameStore((state) => state.worldCupRun);
  const startWorldCupRun = useGameStore((state) => state.startWorldCupRun);
  const restartWorldCupRun = useGameStore((state) => state.restartWorldCupRun);
  const continueWorldCupRun = useGameStore((state) => state.continueWorldCupRun);
  const simulateMatch = useGameStore((state) => state.simulateWorldCupRunMatch);
  const simulateGroup = useGameStore((state) => state.simulateWorldCupRunGroup);
  const simulateRound = useGameStore((state) => state.simulateWorldCupRunRound);
  const enterKnockouts = useGameStore((state) => state.enterWorldCupRunKnockouts);
  const clearQuickResult = useGameStore((state) => state.prepareRematch);
  const [revealedFixtures, setRevealedFixtures] = useState<string[]>([]);
  const [changedTeams, setChangedTeams] = useState<string[]>([]);
  const [teamMovements, setTeamMovements] = useState<
    Record<string, "up" | "down">
  >({});
  const [deferredResult, setDeferredResult] = useState(false);
  const [deferredFixtureId, setDeferredFixtureId] = useState<string | null>(null);
  const [championCelebrationDismissed, setChampionCelebrationDismissed] =
    useState(false);
  const [shootoutPresentation, setShootoutPresentation] =
    useState<ShootoutPresentation | null>(null);
  const [shootoutKickIndex, setShootoutKickIndex] = useState(0);
  const [shootoutOutcomeVisible, setShootoutOutcomeVisible] = useState(false);
  const [shootoutComplete, setShootoutComplete] = useState(false);

  const dismissDeferredResult = () => {
    setDeferredResult(false);
    setDeferredFixtureId(null);
  };

  useEffect(() => {
    if (!shootoutPresentation || shootoutComplete) return;

    const reveal = window.setTimeout(
      () => setShootoutOutcomeVisible(true),
      900,
    );
    const advance = window.setTimeout(() => {
      if (shootoutKickIndex < shootoutPresentation.kicks.length - 1) {
        setShootoutOutcomeVisible(false);
        setShootoutKickIndex((index) => index + 1);
      } else {
        setShootoutComplete(true);
      }
    }, 2350);

    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(advance);
    };
  }, [shootoutComplete, shootoutKickIndex, shootoutPresentation]);

  const dismissShootoutPresentation = () => {
    setShootoutPresentation(null);
    setShootoutKickIndex(0);
    setShootoutOutcomeVisible(false);
    setShootoutComplete(false);
    clearQuickResult();
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
     * Knockout quick-sims hold on the fixture that was just played until NEXT ROUND.
     * Group-stage quick-sims advance directly to the next match because the completed
     * score is already visible in the fixtures panel. Group elimination is the one
     * exception: keep the final score/table visible until NEXT reveals the loss screen.
     */
    if (
      before.currentStage !== "group" &&
      before.currentStage !== "complete" &&
      before.status === "active"
    ) {
      const fixtureBeforeSimulation = getPendingWorldCupRunUserFixture(before);

      flushSync(() => {
        setDeferredResult(Boolean(fixtureBeforeSimulation));
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

    const latestState = useGameStore.getState();
    const after = latestState.worldCupRun;
    if (!after) return;

    const detailedShootout = latestState.matchResult?.score.penaltyShootout;
    const aggregatePenalties = latestState.matchResult?.score.penalties;
    if (
      before.currentStage === "final" &&
      detailedShootout?.length &&
      aggregatePenalties
    ) {
      const pendingFinal = getPendingWorldCupRunUserFixture(before);
      const opponentId = pendingFinal
        ? pendingFinal.homeTeamId === before.userTeamId
          ? pendingFinal.awayTeamId
          : pendingFinal.homeTeamId
        : null;
      const opponentName =
        before.teams.find((team) => team.id === opponentId)?.name ?? t("opponent");

      setShootoutPresentation({
        kicks: detailedShootout,
        opponentName,
        finalScore: aggregatePenalties,
        userWon: aggregatePenalties[0] > aggregatePenalties[1],
      });
      setShootoutKickIndex(0);
      setShootoutOutcomeVisible(false);
      setShootoutComplete(false);
    }

    const newlyPlayedUserFixtureId = [...after.history]
      .reverse()
      .find(
        (entry) =>
          !previousFixtureIds.has(entry.fixtureId) &&
          [entry.homeTeamId, entry.awayTeamId].includes(after.userTeamId),
      )?.fixtureId;

    if (newlyPlayedUserFixtureId) {
      const holdCompactResult =
        before.currentStage !== "group" || after.status === "eliminated";

      setDeferredResult(holdCompactResult);
      setDeferredFixtureId(holdCompactResult ? newlyPlayedUserFixtureId : null);
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
        <p className="eyebrow">{t("preparing")}</p>
      </main>
    );
  }

  if (!run) {
    return (
      <div className={`game-page game-page--stadium ${styles.shell} ${styles.launchShell}`}>
        <GameHeader step={t("title")} />
        <SaveNotice />
        <main
          className={`container game-main ${styles.launch}`}
          style={
            {
              "--world-cup-launch-bg": `url(${backgroundWorldCupImage.src})`,
            } as CSSProperties
          }
        >
          <div className={styles.launchBackdrop} aria-hidden />

          <section className={styles.launchContent}>
            <div className={styles.launchKicker}>
              <i />
              <p className="eyebrow eyebrow--gold">{t("launch.eyebrow")}</p>
              <i />
            </div>

            <h1 className={styles.launchHeadline}>
              {t("launch.enter")}
              <span>{t("launch.worldCup")}</span>
            </h1>

            <div className={styles.launchMeta} aria-label={t("launch.overviewAria")}>
              <span>{t("launch.nations")}</span>
              <i />
              <span>{t("launch.oneTrophy")}</span>
              <i />
              <span>{t("launch.startsNow")}</span>
            </div>

            <div className={styles.launchActions}>
              <Button onClick={startWorldCupRun}>
                {t("launch.begin")} <ArrowRight size={16} aria-hidden />
              </Button>
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
  const completedUserFixtures = run.fixtures.filter(
    (fixture) =>
      Boolean(fixture.result) &&
      [fixture.homeTeamId, fixture.awayTeamId].includes(run.userTeamId),
  );
  const championWins = completedUserFixtures.filter((fixture) => {
    if (!fixture.result) return false;

    const userAtHome = fixture.homeTeamId === run.userTeamId;
    const userGoals = userAtHome
      ? fixture.result.homeGoals
      : fixture.result.awayGoals;
    const opponentGoals = userAtHome
      ? fixture.result.awayGoals
      : fixture.result.homeGoals;

    if (userGoals !== opponentGoals) return userGoals > opponentGoals;
    return fixture.stage !== "group" && winnerFor(fixture) === run.userTeamId;
  }).length;

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
    deferredResult && deferredFixtureId
      ? run.fixtures.find((fixture) => fixture.id === deferredFixtureId) ?? null
      : null;

  /*
   * Quick simulation may advance the tournament domain immediately. Keep the
   * fixture Trophy XI actually just played on screen until the user explicitly
   * presses NEXT MATCH / NEXT ROUND.
   */
  const routeFixture = deferredUserFixture ?? userCurrentFixture;
  const displayStage =
    deferredResult && deferredUserFixture
      ? deferredUserFixture.stage
      : run.currentStage;
  const currentStageIndex =
    displayStage === "complete" ? stageOrder.length : stageOrder.indexOf(displayStage);
  const eliminatedStage = (run.eliminatedStage ?? "group") as Exclude<
    WorldCupRunStage,
    "complete"
  >;
  const mobileProgressStage = getMobileTournamentProgressStage({
    currentStage: displayStage,
    status: run.status,
    eliminatedStage: run.eliminatedStage,
  });
  const mobileProgressStageIndex =
    mobileProgressStage === "complete"
      ? stageOrder.length
      : stageOrder.indexOf(mobileProgressStage);

  const currentRoundPending =
    run.currentStage !== "complete" &&
    run.fixtures.some((fixture) => fixture.stage === run.currentStage && !fixture.result);
  const finalOpponent = nextOpponentId ? teams.get(nextOpponentId) : null;

  // A loss screen is terminal only after the compact result has been shown
  // and the user explicitly continues.
  const tournamentOver = run.status === "eliminated" && !deferredResult;
  const userLostCurrentFixture = Boolean(
    routeFixture?.result && winnerFor(routeFixture) !== run.userTeamId,
  );
  const qualifiedAsBestThird =
    run.qualificationStatus === "qualified" &&
    userStanding.rank === 3 &&
    bestThirdQualifierIds.has(run.userTeamId);
  const champion = run.championTeamId ? teams.get(run.championTeamId) : null;
  const lossScreen = lossPresentation[eliminatedStage];

  return (
    <div className={`game-page game-page--stadium ${styles.shell}`}>
      <GameHeader step={t("title")} />
      <SaveNotice />
      {shootoutPresentation && (
        <section
          className={styles.shootoutOverlay}
          aria-live="assertive"
          aria-label={t("shootout.aria")}
        >
          <div className={styles.shootoutCard}>
            <p className="eyebrow eyebrow--gold">{t("shootout.eyebrow")}</p>
            {shootoutComplete ? (
              <div className={styles.shootoutSummary}>
                <span>{t("shootout.complete")}</span>
                <h2>
                  {shootoutPresentation.userWon
                    ? t("shootout.userWins")
                    : t("shootout.opponentWins", { opponent: localize(shootoutPresentation.opponentName).toUpperCase() })}
                </h2>
                <strong>
                  {shootoutPresentation.finalScore[0]} –{" "}
                  {shootoutPresentation.finalScore[1]}
                </strong>
                <p>
                  {shootoutPresentation.userWon
                    ? t("shootout.userWinDescription")
                    : t("shootout.lossDescription")}
                </p>
                <Button onClick={dismissShootoutPresentation}>
                  {t("continue")} <ArrowRight size={15} />
                </Button>
              </div>
            ) : (
              (() => {
                const kick =
                  shootoutPresentation.kicks[
                    Math.min(
                      shootoutKickIndex,
                      shootoutPresentation.kicks.length - 1,
                    )
                  ];
                const previous =
                  shootoutKickIndex > 0
                    ? shootoutPresentation.kicks[shootoutKickIndex - 1]
                    : null;
                const displayedUserPenalties =
                  shootoutOutcomeVisible
                    ? kick.userPenalties
                    : previous?.userPenalties ?? 0;
                const displayedOpponentPenalties =
                  shootoutOutcomeVisible
                    ? kick.opponentPenalties
                    : previous?.opponentPenalties ?? 0;

                return (
                  <div
                    className={styles.shootoutKick}
                    data-result={
                      shootoutOutcomeVisible
                        ? kick.scored
                          ? "goal"
                          : "miss"
                        : "waiting"
                    }
                  >
                    <div className={styles.shootoutScore}>
                      <span>TROPHY XI</span>
                      <strong>
                        {displayedUserPenalties} – {displayedOpponentPenalties}
                      </strong>
                      <span>{localize(shootoutPresentation.opponentName).toUpperCase()}</span>
                    </div>
                    <p className={styles.shootoutRound}>
                      {kick.suddenDeath
                        ? t("shootout.suddenDeath")
                        : t("shootout.kick", { order: kick.order, team: kick.team === "user" ? "TROPHY XI" : localize(shootoutPresentation.opponentName).toUpperCase() })}
                    </p>
                    <h2>{kick.playerName}</h2>
                    <p className={styles.shootoutApproach}>
                      {t("shootout.approach")}
                    </p>
                    <div className={styles.shootoutOutcome}>
                      {shootoutOutcomeVisible ? (
                        <strong>{kick.scored ? t("shootout.goal") : t("shootout.miss")}</strong>
                      ) : (
                        <span>{t("shootout.whistle")}</span>
                      )}
                    </div>
                    <small>
                      {shootoutKickIndex + 1} / {shootoutPresentation.kicks.length}
                    </small>
                  </div>
                );
              })()
            )}
          </div>
        </section>
      )}
      <main
        className={`container ${styles.main}`}
        data-knockout={run.currentStage !== "group"}
        data-terminal={
          tournamentOver ||
          (run.status === "champion" && !championCelebrationDismissed)
        }
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
                  ? t("header.group", { group: userGroup.id })
                  : t("header.knockout")}
              </p>
              {run.currentStage === "group" && (
                <h1>{localize(stageLabels[run.currentStage])}</h1>
              )}
            </div>
          </div>
          <div className={styles.headerStatus} data-status={run.status}>
            <span>
              {qualifiedAsBestThird && run.currentStage === "group"
                ? t("status.knockoutSecured")
                : run.status === "active"
                  ? t("status.live")
                  : localize(run.status).toUpperCase()}
            </span>
            <b>
              {run.currentStage === "group"
                ? run.qualificationStatus === "pending"
                  ? t("status.groupPosition", { rank: userStanding.rank })
                  : qualifiedAsBestThird
                    ? t("status.bestThirdQualified")
                    : localize(run.qualificationStatus).toUpperCase()
                : localize(stageLabels[run.currentStage])}
            </b>
          </div>
          <button
            className={styles.restart}
            type="button"
            aria-label={t("restart")}
            title={t("restart")}
            onClick={() => {
              if (window.confirm(t("restartConfirm"))) restartWorldCupRun();
            }}
          >
            <RotateCcw size={14} aria-hidden /> {t("restartShort")}
          </button>
        </header>

        <nav
          className={styles.progress}
          aria-label={t("progressAria")}
          data-champion={run.status === "champion"}
          data-eliminated={run.status === "eliminated"}
        >
          {stageOrder.map((stage, index) => (
            <div
              key={stage}
              data-active={stage === displayStage}
              data-complete={index < currentStageIndex}
              data-mobile-active={stage === mobileProgressStage}
              data-mobile-complete={index < mobileProgressStageIndex}
            >
              <span>{index + 1}</span>
              <b>{stage === "group" ? t("groups") : localize(shortStageLabels[stage])}</b>
            </div>
          ))}
        </nav>

        {tournamentOver ? (
          <section
            className={`${styles.terminal} ${styles.lossState}`}
            data-stage={eliminatedStage}
            data-testid="world-cup-loss"
          >
            <div className={styles.lossAtmosphere} aria-hidden />
            <div className={styles.lossCopy}>
              <p className={styles.lossEyebrow}>
                <span className={styles.desktopEndgameCopy}>{localize(lossScreen.eyebrow)}</span>
                <span className={styles.mobileEndgameCopy}>{localize(stageLabels[eliminatedStage])}</span>
              </p>
              <h2>{localize(lossScreen.headline)}</h2>
              <p className={styles.lossBody}>
                <span className={styles.desktopEndgameCopy}>
                  {eliminatedStage === "group"
                    ? t("loss.group", { rank: userStanding.rank, group: userGroup.id })
                    : eliminatedStage === "final"
                      ? (() => {
                          const finalFixture = run.fixtures.find(
                            (fixture) =>
                              fixture.stage === "final" &&
                              [fixture.homeTeamId, fixture.awayTeamId].includes(run.userTeamId),
                          );

                          if (!finalFixture?.result?.penalties) {
                            return t("loss.final");
                          }

                          const userAtHome = finalFixture.homeTeamId === run.userTeamId;
                          const userPenalties = userAtHome
                            ? finalFixture.result.penalties[0]
                            : finalFixture.result.penalties[1];
                          const opponentPenalties = userAtHome
                            ? finalFixture.result.penalties[1]
                            : finalFixture.result.penalties[0];

                          return t("loss.penalties", { user: userPenalties, opponent: opponentPenalties });
                        })()
                      : t("loss.knockout")}
                </span>
                <span className={styles.mobileEndgameCopy}>
                  {t("loss.saved")}
                </span>
              </p>

              <div className={styles.lossActions}>
                <Button onClick={() => router.push("/play")}>{t("returnToMenu")}</Button>
                <Button variant="secondary" onClick={restartWorldCupRun}>
                  <RotateCcw size={15} /> {t("restartWorldCup")}
                </Button>
              </div>
            </div>

            <div className={styles.lossVisual} aria-hidden>
              <div className={styles.lossVisualGlow} />
              <img
                src={lossScreen.image}
                alt=""
                className={styles.lossPlayer}
                data-testid="world-cup-loss-player"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </section>
        ) : run.status === "champion" && !championCelebrationDismissed ? (
          <section
            className={`${styles.terminal} ${styles.championState}`}
            data-testid="world-cup-victory"
          >
            <div className={styles.winAtmosphere} aria-hidden />

            <div className={styles.winCopy}>
              <p className={styles.winEyebrow}>{t("victory.worldChampions")}</p>
              <h2>
                <span className={styles.winHeadlineLead}>Trophy XI</span>
                <span className={styles.winHeadlineAccent}>
                  <span>{t("victory.reach")}</span> <span>{t("victory.summit")}</span>
                </span>
              </h2>
              <p className={styles.winBody}>
                {t("victory.description")}
              </p>

              <div
                className={styles.winStats}
                aria-label={t("victory.summaryAria")}
                data-testid="world-cup-victory-stats"
              >
                <article>
                  <Play size={19} aria-hidden />
                  <strong>{completedUserFixtures.length}</strong>
                  <span>{t("victory.matches")}</span>
                </article>
                <article>
                  <Trophy size={19} aria-hidden />
                  <strong>{championWins}</strong>
                  <span>{t("victory.wins")}</span>
                </article>
                <article>
                  <Crown size={20} aria-hidden />
                  <strong>1</strong>
                  <span>{t("victory.title")}</span>
                </article>
              </div>

              <div className={styles.winActions}>
                <Button
                  className={styles.winPrimaryAction}
                  onClick={() => router.push("/play")}
                >
                  {t("victory.returnMain")} <ArrowRight size={16} aria-hidden />
                </Button>
                <Button
                  className={styles.winSecondaryAction}
                  variant="secondary"
                  onClick={() => setChampionCelebrationDismissed(true)}
                >
                  {t("victory.viewRun")}
                </Button>
              </div>
            </div>

            <div className={styles.winVisual} aria-hidden>
              <div className={styles.winVisualGlow} />
              <img
                src={winImage.src}
                alt=""
                className={styles.winPlayer}
                data-testid="world-cup-victory-art"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </section>
        ) : !knockoutView ? (
          <div className={styles.groupDashboard} data-testid="world-cup-group-dashboard">
            <div className={styles.groupPrimaryRail}>
              <section
                className={`${styles.panel} ${styles.nextPanel}`}
                data-testid="world-cup-next-fixture"
              >
                <div className={styles.panelTopline}>
                  <span><Zap size={13} /> {t("group.nextFixture")}</span>
                  <b>{nextFixture ? t("group.matchday", { number: nextFixture.matchday ?? "" }) : t("group.complete")}</b>
                </div>
                {nextFixture && nextOpponentId ? (
                  <div className={styles.fixtureHero}>
                    <TeamIdentity team={teams.get(run.userTeamId)!} home />
                    <div className={styles.versus}><span>VS</span><small>{t("group.label", { group: userGroup.id })}</small></div>
                    <TeamIdentity team={teams.get(nextOpponentId)!} />
                  </div>
                ) : (
                  <div className={styles.qualifiedHero}>
                    <div className={styles.qualifiedHeroContent}>
                      <p className="eyebrow eyebrow--gold">
                        {run.status === "eliminated"
                          ? t("group.complete")
                          : qualifiedAsBestThird
                            ? t("group.bestThirdQualifier")
                            : t("group.qualified")}
                      </p>
                      <h2>
                        {run.status === "eliminated"
                          ? t("group.finalScores")
                          : qualifiedAsBestThird
                            ? t("group.thirdThrough")
                            : t("group.knockoutOpen")}
                      </h2>
                      {qualifiedAsBestThird && (
                        <span className={styles.thirdPlaceNotice}>
                          <b>3RD</b>
                          <span>{t("group.bestThirdNotice")}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className={styles.quickActions}>
                  {deferredResult ? (
                    <Button onClick={dismissDeferredResult}>
                      {t("next")} <ArrowRight size={15} />
                    </Button>
                  ) : run.qualificationStatus === "qualified" ? (
                    <Button onClick={enterKnockouts}>
                      {t("group.enterRound32")} <ArrowRight size={15} />
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => animateQuickSimulation(simulateMatch)}
                        disabled={!nextFixture}
                      >
                        <Play size={14} fill="currentColor" /> {t("simulateMatch")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => animateQuickSimulation(simulateGroup)}
                      >
                        <Users size={15} /> {t("simulateGroup")}
                      </Button>
                    </>
                  )}
                </div>
              </section>

              <section
                className={`${styles.panel} ${styles.groupRoadPanel}`}
                data-testid="world-cup-group-road"
              >
                <div className={styles.panelTopline}>
                  <span>{t("group.road")}</span>
                  <b>{t("group.matchCount", { count: 3 })}</b>
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
                    let roadLabel = isNext ? t("next") : t("upcoming");

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
                        title={localize(opponent.name)}
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

            <section
              className={`${styles.panel} ${styles.standingsPanel}`}
              data-testid="world-cup-standings"
            >
              <div className={styles.panelTopline}>
                <span>{t("group.standings", { group: userGroup.id })}</span>
                <b>{t("group.advanceRule")}</b>
              </div>
              <div className={styles.tableHead}>
                <span>{t("table.position")}</span><span>{t("table.team")}</span><span>{t("table.played")}</span><span>{t("table.goalDifference")}</span><span>{t("table.points")}</span>
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
                          aria-label={t("group.automaticQualificationLine")}
                        >
                          <span />
                          <b>{t("group.automaticQualification")}</b>
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
                        <span
                          className={styles.tableTeam}
                          data-trophy-xi={team.countryCode === "TXI"}
                        >
                          <i><TeamMark team={team} compact /></i>
                          <strong>{localize(team.name)}</strong>
                          <small className={isBestThirdQualifier ? styles.bestThirdTag : ""}>
                            {isBestThirdQualifier ? t("group.bestThirdThrough") : team.countryCode}
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
                <span>{t("group.fixtures", { group: userGroup.id })}</span>
                <b>{t("remaining", { count: unresolvedGroupFixtures.length })}</b>
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
                  {displayStage === "final" ? t("knockout.championshipMatch") : t("knockout.route")}
                </p>
                {!(run.status === "champion" && run.currentStage === "complete") && (
                  <h2>
                    {userLostCurrentFixture
                      ? t("knockout.runEnds")
                      : displayStage === "final"
                        ? t("knockout.oneMatch")
                        : routeFixture?.result
                          ? t("knockout.advanced")
                          : t("knockout.stageMatch", { stage: localize(stageLabels[displayStage]) })}
                  </h2>
                )}
              </div>
              {routeFixture && (
                <div className={styles.routeFixture}>
                  <div
                    className={styles.routeTeam}
                    data-user={routeFixture.homeTeamId === run.userTeamId}
                  >
                    <span>
                      <TeamMark team={teams.get(routeFixture.homeTeamId)!} compact />
                      <strong>{localize(teams.get(routeFixture.homeTeamId)!.name)}</strong>
                    </span>
                    <small>
                      {teams.get(routeFixture.homeTeamId)!.countryCode}
                      <i>·</i>
                      <b>{teams.get(routeFixture.homeTeamId)!.rating} {t("overallShort")}</b>
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
                            {t("knockout.noShootout")}
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
                          aria-label={t(wonShootout ? "knockout.penaltiesWonAria" : "knockout.penaltiesLostAria", { user: userPenalties, opponent: opponentPenalties })}
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
                      <TeamMark team={teams.get(routeFixture.awayTeamId)!} compact />
                      <strong>{localize(teams.get(routeFixture.awayTeamId)!.name)}</strong>
                    </span>
                    <small>
                      {teams.get(routeFixture.awayTeamId)!.countryCode}
                      <i>·</i>
                      <b>{teams.get(routeFixture.awayTeamId)!.rating} {t("overallShort")}</b>
                    </small>
                  </div>
                </div>
              )}
              <div className={styles.quickActions}>
                {run.status === "champion" && run.currentStage === "complete" ? (
                  <Button
                    className={styles.nextAction}
                    variant="secondary"
                    onClick={() => setChampionCelebrationDismissed(false)}
                  >
                    <ArrowLeft size={15} aria-hidden /> {t("goBack")}
                  </Button>
                ) : deferredResult ? (
                  run.status === "eliminated" ? (
                    <Button
                      className={styles.nextAction}
                      onClick={dismissDeferredResult}
                    >
                      {t("next")} <ArrowRight size={15} />
                    </Button>
                  ) : (
                    <>
                      <Button
                        className={styles.nextAction}
                        onClick={dismissDeferredResult}
                      >
                        {t("nextRound")} <ArrowRight size={15} />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => animateQuickSimulation(simulateRound)}
                        disabled={!currentRoundPending}
                      >
                        <FastForward size={15} fill="currentColor" /> {t("simulateRound")}
                      </Button>
                    </>
                  )
                ) : run.currentStage === "final" && nextFixture && finalOpponent ? (
                  <Button
                    className={styles.championshipAction}
                    onClick={() => {
                      continueWorldCupRun();
                      router.push("/match");
                    }}
                  >
                    {t("knockout.enterChampionship")} <ArrowRight size={15} />
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => animateQuickSimulation(simulateMatch)}
                      disabled={!nextFixture}
                    >
                      <Play size={14} fill="currentColor" /> {t("simulateMatch")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => animateQuickSimulation(simulateRound)}
                      disabled={!currentRoundPending}
                    >
                      <FastForward size={15} fill="currentColor" /> {t("simulateRound")}
                    </Button>
                  </>
                )}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.bracketPanel}`}>
              <div className={styles.bracketHeading}>
                <div>
                  <p className="eyebrow">{t("bracket.full")}</p>
                  <h3>{t("bracket.roadFinal")}</h3>
                </div>
                <span><i /> {t("bracket.path")}</span>
              </div>
              <div className={styles.desktopBracket}>
                <FullBracket
                  fixtures={run.fixtures}
                  teams={teams}
                  userTeamId={run.userTeamId}
                  revealedFixtures={revealedFixtures}
                />
              </div>
              <MobileKnockoutBracket
                fixtures={run.fixtures}
                teams={teams}
                userTeamId={run.userTeamId}
                currentStage={
                  displayStage === "complete"
                    ? "final"
                    : displayStage as WorldCupRunKnockoutStage
                }
              />
            </section>
          </div>
        )}

        {run.currentStage === "complete" && run.status !== "champion" && !tournamentOver && (
          <p>{t("championLifts", { champion: champion ? localize(champion.name) : t("theChampion") })}</p>
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

function TeamMark({
  team,
  compact = false,
}: {
  team: Team;
  compact?: boolean;
}) {
  if (team.countryCode === "TXI") {
    if (compact) return null;

    return (
      <b className={styles.trophyXiMainMark} aria-label="Trophy XI">
        XI
      </b>
    );
  }

  return <>{flagForCountry(team.countryCode)}</>;
}

function TeamIdentity({ team, home = false }: { team: Team; home?: boolean }) {
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
  return (
    <div
      className={styles.teamIdentity}
      data-home={home}
      style={{ "--nation-accent": accentFor(team.countryCode) } as CSSProperties}
    >
      <span><TeamMark team={team} /></span>
      <div>
        <strong>{localize(team.name)}</strong>
        <small>
          <span>{team.countryCode}</span>
          <b>{team.rating} {t("overallShort")}</b>
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
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
  const home = teams.get(fixture.homeTeamId)!;
  const away = teams.get(fixture.awayTeamId)!;
  return (
    <article
      className={styles.compactFixture}
      data-revealed={revealed}
      data-user={[fixture.homeTeamId, fixture.awayTeamId].includes(userTeamId)}
    >
      <small>{t("group.matchdayShort", { number: fixture.matchday ?? "" })}</small>
      <span data-user-team={home.id === userTeamId}>
        <TeamMark team={home} compact /> {localize(home.name)}
      </span>
      <b>{fixture.result ? `${fixture.result.homeGoals}–${fixture.result.awayGoals}` : "—"}</b>
      <span data-user-team={away.id === userTeamId}>
        <TeamMark team={away} compact /> {localize(away.name)}
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

const knockoutRoundMatchCounts: Record<WorldCupRunKnockoutStage, number> = {
  "round-of-32": 16,
  "round-of-16": 8,
  "quarter-final": 4,
  "semi-final": 2,
  final: 1,
};

function MobileKnockoutBracket({
  fixtures,
  teams,
  userTeamId,
  currentStage,
}: {
  fixtures: WorldCupRunFixture[];
  teams: Map<string, Team>;
  userTeamId: string;
  currentStage: WorldCupRunKnockoutStage;
}) {
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
  const [inspectedStage, setInspectedStage] =
    useState<WorldCupRunKnockoutStage | null>(null);
  const selectedStage = inspectedStage ?? currentStage;
  const currentStageIndex = WORLD_CUP_RUN_KNOCKOUT_STAGES.indexOf(currentStage);
  const selectedFixtures = fixtures.filter(
    (fixture) => fixture.stage === selectedStage,
  );
  const previousStage = previousKnockoutStage[selectedStage];

  return (
    <div
      className={styles.mobileBracketBrowser}
      data-testid="mobile-knockout-bracket"
      data-stage={selectedStage}
    >
      <nav className={styles.roundNav} aria-label={t("bracket.browseRounds")}>
        {WORLD_CUP_RUN_KNOCKOUT_STAGES.map((stage, index) => {
          const roundFixtures = fixtures.filter((fixture) => fixture.stage === stage);
          const complete =
            index < currentStageIndex ||
            (roundFixtures.length === knockoutRoundMatchCounts[stage] &&
              roundFixtures.every((fixture) => Boolean(fixture.result)));

          return (
            <button
              key={stage}
              type="button"
              aria-pressed={selectedStage === stage}
              data-complete={complete}
              data-current={currentStage === stage}
              data-selected={selectedStage === stage}
              onClick={() => setInspectedStage(stage)}
            >
              <span>{localize(shortStageLabels[stage])}</span>
              <small>{localize(stageLabels[stage])}</small>
            </button>
          );
        })}
      </nav>

      <header className={styles.mobileRoundHeading}>
        <div>
          <span>{t("bracket.selectedRound")}</span>
          <h4>{localize(stageLabels[selectedStage])}</h4>
        </div>
        <b>{t("bracket.matchCount", { count: knockoutRoundMatchCounts[selectedStage] })}</b>
        {selectedStage === "final" && <Trophy size={22} aria-hidden />}
      </header>

      <div className={styles.mobileRoundMatches}>
        {Array.from({ length: knockoutRoundMatchCounts[selectedStage] }, (_, index) => {
          const fixture = selectedFixtures[index];
          const feeder = index * 2 + 1;

          if (!fixture) {
            const firstFeederLabel = previousStage
              ? t("bracket.winnerFeeder", { stage: localize(shortStageLabels[previousStage]), match: feeder })
              : t("bracket.qualifiedTeam", { number: feeder });
            const secondFeederLabel = previousStage
              ? t("bracket.winnerFeeder", { stage: localize(shortStageLabels[previousStage]), match: feeder + 1 })
              : t("bracket.qualifiedTeam", { number: feeder + 1 });

            return (
              <article
                key={`${selectedStage}-${index}`}
                className={styles.mobileKnockoutMatch}
                data-placeholder="true"
                data-final={selectedStage === "final"}
              >
                <small>{t("bracket.matchUpcoming", { number: String(index + 1).padStart(2, "0") })}</small>
                <div><span>◇</span><strong>{firstFeederLabel}</strong><b>–</b></div>
                <div><span>◇</span><strong>{secondFeederLabel}</strong><b>–</b></div>
              </article>
            );
          }

          const home = teams.get(fixture.homeTeamId)!;
          const away = teams.get(fixture.awayTeamId)!;
          const winner = winnerFor(fixture);
          const involvesUser = [fixture.homeTeamId, fixture.awayTeamId].includes(userTeamId);

          return (
            <article
              key={fixture.id}
              className={styles.mobileKnockoutMatch}
              data-complete={Boolean(fixture.result)}
              data-final={selectedStage === "final"}
              data-user={involvesUser}
            >
              <small>
                {t(fixture.result ? "bracket.matchFullTime" : "bracket.matchUpcoming", { number: String(index + 1).padStart(2, "0") })}
              </small>
              <div
                data-user-team={home.id === userTeamId}
                data-winner={winner === home.id}
                data-eliminated={Boolean(winner && winner !== home.id)}
              >
                <span><TeamMark team={home} /></span>
                <strong>{localize(home.name)}</strong>
                <b>{fixture.result?.homeGoals ?? "–"}</b>
              </div>
              <div
                data-user-team={away.id === userTeamId}
                data-winner={winner === away.id}
                data-eliminated={Boolean(winner && winner !== away.id)}
              >
                <span><TeamMark team={away} /></span>
                <strong>{localize(away.name)}</strong>
                <b>{fixture.result?.awayGoals ?? "–"}</b>
              </div>
              {fixture.result?.penalties && (
                <em>{t("bracket.penalties")} {fixture.result.penalties[0]}–{fixture.result.penalties[1]}</em>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

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
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
  const fixtureFor = (stage: WorldCupRunKnockoutStage, index: number) =>
    fixtures.filter((fixture) => fixture.stage === stage)[index];

  const renderRound = (
    stage: WorldCupRunKnockoutStage,
    indices: number[],
    side: "left" | "right",
  ) => (
    <section className={styles.bracketRound} data-side={side} data-stage={stage}>
      <header>
        <b>{localize(shortStageLabels[stage])}</b>
        <span>{localize(stageLabels[stage])}</span>
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
    aria-label={t("bracket.fullAria")}
  >
    {renderRound("round-of-32", [0, 1, 2, 3, 4, 5, 6, 7], "left")}
    {renderRound("round-of-16", [0, 1, 2, 3], "left")}
    {renderRound("quarter-final", [0, 1], "left")}
    {renderRound("semi-final", [0], "left")}

    <section className={styles.finalColumn}>
      <header>
        <b>{localize(shortStageLabels.final)}</b>
        <span>{t("bracket.decider")}</span>
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

        <small>{t("bracket.winnerLifts")}</small>
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
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
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
          <small>{t("bracket.match", { number: String(index + 1).padStart(2, "0") })}</small>
          <div><span>◇</span><strong>{t("bracket.winnerFeeder", { stage: localize(shortStageLabels[previousStage!]), match: firstFeeder })}</strong><b>–</b></div>
          <div><span>◇</span><strong>{t("bracket.winnerFeeder", { stage: localize(shortStageLabels[previousStage!]), match: firstFeeder + 1 })}</strong><b>–</b></div>
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
  const t = useTranslations("worldCupRun");
  const localize = useLocalizedContent();
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
      <small>{t("bracket.match", { number: String(index + 1).padStart(2, "0") })}</small>
      <div data-winner={winner === home.id} data-eliminated={Boolean(winner && winner !== home.id)}>
        <span><TeamMark team={home} compact /></span>
        <strong>{localize(home.name)}</strong>
        <b>{fixture.result?.homeGoals ?? "–"}</b>
      </div>
      <div data-winner={winner === away.id} data-eliminated={Boolean(winner && winner !== away.id)}>
        <span><TeamMark team={away} compact /></span>
        <strong>{localize(away.name)}</strong>
        <b>{fixture.result?.awayGoals ?? "–"}</b>
      </div>
      {fixture.result?.penalties && (
        <em>{t("bracket.penShort")} {fixture.result.penalties[0]}–{fixture.result.penalties[1]}</em>
      )}
    </article>
  );
}
