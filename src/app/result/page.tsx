"use client";

import { Check, Copy, RotateCcw, Share2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TeamRatings } from "@/components/draft/team-ratings";
import { GameHeader } from "@/components/navigation/game-header";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { MatchStats } from "@/components/result/match-stats";
import { ShareCard } from "@/components/result/share-card";
import { Button } from "@/components/ui/button";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents/generated";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";
import type { PlayerTournamentCard } from "@/types/game";

const benchSlots = ["bench-1", "bench-2", "bench-3"] as const;

export default function ResultPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const hydrated = useGameStore((state) => state.hasHydrated);
  const formationId = useGameStore((state) => state.formationId);
  const eraId = useGameStore((state) => state.eraId);
  const picks = useGameStore((state) => state.picks);
  const benchPicks = useGameStore((state) => state.benchPicks);
  const managerId = useGameStore((state) => state.managerId);
  const selectedOpponentId = useGameStore(
    (state) => state.selectedOpponentId,
  );
  const result = useGameStore((state) => state.matchResult);
  const resetDraft = useGameStore((state) => state.resetDraft);
  const prepareRematch = useGameStore((state) => state.prepareRematch);

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

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">DEVELOPING THE RESULT</p>
      </main>
    );
  }

  if (
    !result ||
    !formation ||
    !manager ||
    !opponent ||
    lineup.length !== 11 ||
    bench.length !== 3
  ) {
    return (
      <div className="game-page">
        <GameHeader step="RESULT" />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">NO RESULT ON RECORD</span>
          <h1>The gauntlet has not been played.</h1>
          <p>Complete a fourteen-player squad and simulate the historical match.</p>
          <Button onClick={() => router.replace("/play/era")}>
            Start a game
          </Button>
        </main>
      </div>
    );
  }

  const era = getDraftEra(eraId ?? "all");
  const opponentLabel = `${opponent.nationName} ${opponent.tournamentYear}`;
  const hasNamedPlayerOfTheMatch =
    result.playerOfTheMatch !== opponentLabel;
  const penaltyWin =
    result.score.penalties && result.score.penalties[0] > result.score.penalties[1];
  const won = result.score.user > result.score.opponent || Boolean(penaltyWin);
  const lost =
    result.score.user < result.score.opponent ||
    Boolean(
      result.score.penalties &&
        result.score.penalties[0] < result.score.penalties[1],
    );
  const headline = won
    ? "You made history blink."
    : lost
      ? "The archive answers back."
      : "History refuses to move.";
  const stars = [...lineup, ...bench]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 3);
  const copyText = `Trophy XI ${result.score.user}–${result.score.opponent} ${opponentLabel}\nBuilt with ${stars
    .map((player) => `${player.playerName} ${player.tournamentYear}`)
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1")}.\nCan your squad beat history?`;

  const copyResult = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="game-page game-page--result">
      <GameHeader step="FINAL RECORD" />
      <main className="container result-main">
        <section
          className={`result-hero result-hero--${won ? "win" : lost ? "loss" : "draw"}`}
        >
          <div className="result-state">
            <span className="eyebrow eyebrow--gold">
              {won ? "HISTORY BEATEN" : lost ? "HISTORY HOLDS" : "DEADLOCK"}
            </span>
            <h1>{headline}</h1>
            <p>
              {hasNamedPlayerOfTheMatch
                ? "Player of the match"
                : "Match distinction"}{" "}
              <b>{result.playerOfTheMatch}</b>
            </p>
          </div>
          <div className="final-score">
            <div>
              <span>YOUR SQUAD</span>
              <b>Trophy XI</b>
            </div>
            <strong>{result.score.user}</strong>
            <i>—</i>
            <strong>{result.score.opponent}</strong>
            <div>
              <span>OPPONENT</span>
              <b>{opponentLabel}</b>
            </div>
            {result.score.penalties && (
              <small>
                PENALTIES {result.score.penalties[0]}–
                {result.score.penalties[1]}
              </small>
            )}
          </div>
          <div className="result-actions">
            <Button
              onClick={() => {
                prepareRematch();
                router.push("/match");
              }}
            >
              <RotateCcw size={16} aria-hidden /> Play again
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetDraft();
                router.push("/play/draft");
              }}
            >
              Redraft
            </Button>
            <Button variant="ghost" onClick={copyResult}>
              {copied ? (
                <Check size={16} aria-hidden />
              ) : (
                <Copy size={16} aria-hidden />
              )}
              {copied ? "Copied" : "Copy result"}
            </Button>
          </div>
        </section>

        <div className="result-grid">
          <section className="result-panel result-panel--stats">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">MATCH REPORT</span>
                <h2>The numbers</h2>
              </div>
              <span className="seed-badge">SEED {result.seed}</span>
            </div>
            <MatchStats result={result} opponentLabel={opponentLabel} />
          </section>

          <section className="result-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TEAM PROFILE</span>
                <h2>Your final ratings</h2>
              </div>
              <Sparkles size={19} aria-hidden />
            </div>
            <TeamRatings ratings={result.userRatings} expanded />
            <p className="chemistry-note">
              Era Translation applies in both directions: Trophy XI{" "}
              {result.userRatings.eraFit}, {opponentLabel}{" "}
              {result.opponentEraFit}. Quality remains the strongest factor.
            </p>
            <p className="manager-impact">
              <b>Manager impact:</b> {result.managerImpact}
            </p>
          </section>
        </div>

        <section className="lineups-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow--gold">TEAM SHEET</p>
              <h2>Eleven starters. Three ordered alternatives.</h2>
            </div>
          </div>
          <div className="lineup-grid">
            <article className="lineup-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    YOUR XI / {formation.name} / {era.label} /{" "}
                    {manager.managerName}
                  </span>
                  <h3>Trophy XI</h3>
                </div>
                <b>{result.userRatings.overall}</b>
              </div>
              <TacticalPitch formation={formation} lineup={lineup} picks={picks} />
            </article>
            <article className="lineup-panel opponent-result-dossier">
              <span className="eyebrow">HISTORICAL OPPONENT</span>
              <h3>{opponentLabel}</h3>
              <p>{opponent.tacticalProfile}</p>
              <dl>
                <div><dt>Finish</dt><dd>{opponent.tournamentFinish}</dd></div>
                <div><dt>Formation model</dt><dd>{opponent.formation}</dd></div>
                <div><dt>Manager</dt><dd>{opponent.managerName ?? "Not sourced"}</dd></div>
                <div><dt>Era Translation</dt><dd>{result.opponentEraFit}</dd></div>
                <div><dt>Overall</dt><dd>{opponent.ratings.overall}</dd></div>
                <div><dt>Matches</dt><dd>{opponent.tournamentStats.matches ?? "Not sourced"}</dd></div>
              </dl>
              <small>
                No unsourced historical lineup is invented. Current factual fields
                come from the opponent source record; ratings and tactical labels
                are Trophy XI interpretations.
              </small>
            </article>
          </div>
        </section>

        <section className="result-panel squad-minutes">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SQUAD CONTRIBUTION</span>
              <h2>Minutes for all fourteen players</h2>
            </div>
            <b>{result.substitutions.length} substitutions</b>
          </div>
          <div className="squad-minutes__table">
            {result.playerMinutes.map((player) => (
              <article key={player.cardId}>
                <span>{player.started ? "STARTER" : "BENCH"}</span>
                <b>
                  {player.playerName} {player.tournamentYear}
                </b>
                <strong>{player.minutes} min</strong>
                <small>
                  {player.enteredAt ? `On ${player.enteredAt}’` : "Started"}
                  {player.leftAt ? ` · Off ${player.leftAt}’` : ""}
                  {player.goals ? ` · ${player.goals} G` : ""}
                  {player.assists ? ` · ${player.assists} A` : ""}
                </small>
              </article>
            ))}
          </div>
        </section>

        <div className="result-lower-grid">
          <section className="result-panel event-log">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">FULL TIMELINE</span>
                <h2>How it happened</h2>
              </div>
            </div>
            <ol>
              {result.events.map((event) => (
                <li key={event.id} className={`event-log__${event.type}`}>
                  <time>{event.minuteLabel}</time>
                  <div>
                    <b>{event.title}</b>
                    <p>{event.detail}</p>
                  </div>
                  <span>
                    {event.userScore}–{event.opponentScore}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="share-preview">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">SHARE PREVIEW</span>
                <h2>Send the challenge</h2>
              </div>
              <Share2 size={18} aria-hidden />
            </div>
            <ShareCard
              result={result}
              stars={stars}
              opponentLabel={opponentLabel}
            />
            <Button variant="secondary" onClick={copyResult}>
              {copied ? (
                <Check size={16} aria-hidden />
              ) : (
                <Copy size={16} aria-hidden />
              )}
              {copied ? "Result copied" : "Copy result text"}
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
