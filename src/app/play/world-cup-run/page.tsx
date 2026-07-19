"use client";

import { ArrowRight, RotateCcw, Shield, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { Button } from "@/components/ui/button";
import {
  getPendingWorldCupRunUserFixture,
  WORLD_CUP_RUN_GROUP_IDS,
  WORLD_CUP_RUN_KNOCKOUT_STAGES,
} from "@/engine/world-cup-run";
import { useGameStore } from "@/store/game-store";
import styles from "./world-cup-run.module.css";

const stageLabels = {
  group: "GROUP STAGE",
  "round-of-16": "ROUND OF 16",
  "quarter-final": "QUARTERFINAL",
  "semi-final": "SEMIFINAL",
  final: "FINAL",
  complete: "TOURNAMENT COMPLETE",
} as const;

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
  const startWorldCupRun = useGameStore(
    (state) => state.startWorldCupRun,
  );
  const restartWorldCupRun = useGameStore(
    (state) => state.restartWorldCupRun,
  );
  const continueWorldCupRun = useGameStore(
    (state) => state.continueWorldCupRun,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (gameMode !== "world-cup-run") router.replace("/play");
    else if (!eraId) router.replace("/play/era");
    else if (!managerId) router.replace("/play/manager");
    else if (!formationId) router.replace("/play/formation");
    else if (picks.length !== 11 || benchPicks.length !== 3) {
      router.replace("/play/draft");
    }
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
      <div className="game-page game-page--stadium">
        <GameHeader step="WORLD CUP RUN" />
        <SaveNotice />
        <main className={`container game-main ${styles.launch}`}>
          <span className={styles.trophy} aria-hidden>
            <Trophy size={44} />
          </span>
          <p className="eyebrow eyebrow--gold">YOUR SQUAD IS READY</p>
          <h1>Enter the World Cup.</h1>
          <p>
            A seeded 32-team field will generate eight groups. Play three
            group matches, qualify in the top two, then survive four knockout
            rounds.
          </p>
          <Button onClick={startWorldCupRun}>
            GENERATE TOURNAMENT <ArrowRight size={16} aria-hidden />
          </Button>
        </main>
      </div>
    );
  }

  const teams = new Map(run.teams.map((team) => [team.id, team]));
  const userGroup = run.groups.find((group) =>
    group.teamIds.includes(run.userTeamId),
  )!;
  const nextFixture = getPendingWorldCupRunUserFixture(run);
  const nextOpponentId = nextFixture
    ? nextFixture.homeTeamId === run.userTeamId
      ? nextFixture.awayTeamId
      : nextFixture.homeTeamId
    : null;
  const champion = run.championTeamId
    ? teams.get(run.championTeamId)
    : null;

  return (
    <div className="game-page game-page--stadium">
      <GameHeader step="WORLD CUP RUN" />
      <SaveNotice />
      <main className={`container game-main ${styles.main}`}>
        <header className={styles.header}>
          <div>
            <p className="eyebrow eyebrow--gold">WORLD CUP RUN</p>
            <h1>{stageLabels[run.currentStage]}</h1>
            <div
              className={styles.statuses}
              role="status"
              aria-live="polite"
            >
              <span>STATUS · {run.status.toLocaleUpperCase()}</span>
              <span>
                QUALIFICATION ·{" "}
                {run.qualificationStatus.toLocaleUpperCase()}
              </span>
              <span>{run.history.length} MATCHES RECORDED</span>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Restart this tournament with a new deterministic field?",
                )
              ) {
                restartWorldCupRun();
              }
            }}
          >
            <RotateCcw size={15} aria-hidden /> RESTART TOURNAMENT
          </Button>
        </header>

        {matchResult ? (
          <section className={styles.nextMatch}>
            <div>
              <span className="eyebrow">LAST MATCH COMPLETE</span>
              <h2>
                Trophy XI {matchResult.score.user}–
                {matchResult.score.opponent}
              </h2>
              <p>Your tournament progress has been saved.</p>
            </div>
            <Button onClick={() => router.push("/result")}>
              VIEW MATCH RECORD <ArrowRight size={16} aria-hidden />
            </Button>
          </section>
        ) : nextFixture && nextOpponentId ? (
          <section className={styles.nextMatch}>
            <span className={styles.matchIcon} aria-hidden>
              <Shield size={24} />
            </span>
            <div>
              <span className="eyebrow">NEXT MATCH</span>
              <h2>Trophy XI vs {teams.get(nextOpponentId)?.name}</h2>
              <p>
                {stageLabels[nextFixture.stage]}
                {nextFixture.groupId
                  ? ` · Group ${nextFixture.groupId} · Matchday ${nextFixture.matchday}`
                  : ""}
              </p>
            </div>
            <Button
              onClick={() => {
                continueWorldCupRun();
                router.push("/match");
              }}
            >
              PLAY MATCH <ArrowRight size={16} aria-hidden />
            </Button>
          </section>
        ) : (
          <section className={styles.nextMatch}>
            <span className={styles.matchIcon} aria-hidden>
              <Trophy size={24} />
            </span>
            <div>
              <span className="eyebrow">FINAL STATUS</span>
              <h2>
                {run.status === "champion"
                  ? "Trophy XI are world champions."
                  : `${champion?.name ?? "The champion"} lifts the trophy.`}
              </h2>
              <p>The complete tournament record remains saved below.</p>
            </div>
          </section>
        )}

        <section className={styles.panel} aria-labelledby="group-title">
          <div className={styles.panelHeading}>
            <div>
              <p className="eyebrow">GROUP {userGroup.id}</p>
              <h2 id="group-title">Group standings</h2>
            </div>
            <span>TOP TWO ADVANCE</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col">P</th>
                  <th scope="col">W</th>
                  <th scope="col">D</th>
                  <th scope="col">L</th>
                  <th scope="col">GF</th>
                  <th scope="col">GA</th>
                  <th scope="col">GD</th>
                  <th scope="col">PTS</th>
                </tr>
              </thead>
              <tbody>
                {run.standings[userGroup.id].map((row) => (
                  <tr
                    key={row.teamId}
                    data-user={row.teamId === run.userTeamId}
                  >
                    <td>{row.rank}</td>
                    <th scope="row">{teams.get(row.teamId)?.name}</th>
                    <td>{row.played}</td>
                    <td>{row.won}</td>
                    <td>{row.drawn}</td>
                    <td>{row.lost}</td>
                    <td>{row.goalsFor}</td>
                    <td>{row.goalsAgainst}</td>
                    <td>
                      {row.goalDifference > 0 ? "+" : ""}
                      {row.goalDifference}
                    </td>
                    <td><b>{row.points}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="bracket-title">
          <div className={styles.panelHeading}>
            <div>
              <p className="eyebrow">SEEDED KNOCKOUTS</p>
              <h2 id="bracket-title">Tournament bracket</h2>
            </div>
          </div>
          <div className={styles.bracket}>
            {WORLD_CUP_RUN_KNOCKOUT_STAGES.map((stage) => {
              const fixtures = run.fixtures.filter(
                (fixture) => fixture.stage === stage,
              );
              return (
                <section key={stage}>
                  <h3>{stageLabels[stage]}</h3>
                  {fixtures.length ? (
                    fixtures.map((fixture) => (
                      <article key={fixture.id}>
                        <span>{teams.get(fixture.homeTeamId)?.name}</span>
                        <b>
                          {fixture.result
                            ? `${fixture.result.homeGoals}–${fixture.result.awayGoals}`
                            : "—"}
                        </b>
                        <span>{teams.get(fixture.awayTeamId)?.name}</span>
                        {fixture.result?.penalties && (
                          <small>
                            PEN {fixture.result.penalties[0]}–
                            {fixture.result.penalties[1]}
                          </small>
                        )}
                        {fixture.result?.afterExtraTime &&
                          !fixture.result.penalties && <small>AET</small>}
                      </article>
                    ))
                  ) : (
                    <p>Awaiting qualification.</p>
                  )}
                </section>
              );
            })}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="history-title">
          <div className={styles.panelHeading}>
            <div>
              <p className="eyebrow">TOURNAMENT RECORD</p>
              <h2 id="history-title">Match history</h2>
            </div>
          </div>
          <div className={styles.history}>
            {run.history.length ? (
              [...run.history].reverse().map((entry) => (
                <article key={entry.fixtureId}>
                  <span>
                    {stageLabels[entry.stage]}
                    {entry.groupId ? ` · GROUP ${entry.groupId}` : ""}
                  </span>
                  <strong>
                    {teams.get(entry.homeTeamId)?.name}{" "}
                    {entry.result.homeGoals}–{entry.result.awayGoals}{" "}
                    {teams.get(entry.awayTeamId)?.name}
                  </strong>
                  {entry.result.penalties && (
                    <small>
                      Penalties {entry.result.penalties[0]}–
                      {entry.result.penalties[1]}
                    </small>
                  )}
                  {entry.result.afterExtraTime &&
                    !entry.result.penalties && <small>After extra time</small>}
                </article>
              ))
            ) : (
              <p>No matches have been played yet.</p>
            )}
          </div>
        </section>

        <details className={styles.allGroups}>
          <summary>VIEW ALL EIGHT GROUPS</summary>
          <div>
            {WORLD_CUP_RUN_GROUP_IDS.map((groupId) => (
              <section key={groupId}>
                <h3>GROUP {groupId}</h3>
                {run.standings[groupId].map((row) => (
                  <p key={row.teamId}>
                    <span>{row.rank}. {teams.get(row.teamId)?.name}</span>
                    <b>{row.points} PTS</b>
                  </p>
                ))}
              </section>
            ))}
          </div>
        </details>
      </main>
    </div>
  );
}
