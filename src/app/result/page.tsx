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
import { spain2010 } from "@/data/champions";
import { getDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";
import type { PlayerTournamentCard } from "@/types/game";

export default function ResultPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const hydrated = useGameStore((state) => state.hasHydrated);
  const formationId = useGameStore((state) => state.formationId);
  const eraId = useGameStore((state) => state.eraId);
  const picks = useGameStore((state) => state.picks);
  const managerId = useGameStore((state) => state.managerId);
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
  const manager = managerId ? managersById.get(managerId) : undefined;

  if (!hydrated) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">DEVELOPING THE RESULT</p>
      </main>
    );
  }

  if (!result || !formation || !manager || lineup.length !== 11) {
    return (
      <div className="game-page">
        <GameHeader step="RESULT" />
        <main className="empty-game-state">
          <span className="eyebrow eyebrow--gold">NO RESULT ON RECORD</span>
          <h1>The match has not been played.</h1>
          <p>Draft a complete XI and challenge Spain 2010 to create a result.</p>
          <Button onClick={() => router.replace("/play/era")}>Start a game</Button>
        </main>
      </div>
    );
  }

  const era = getDraftEra(eraId ?? "all");
  const penaltyWin =
    result.score.penalties && result.score.penalties[0] > result.score.penalties[1];
  const won = result.score.user > result.score.opponent || Boolean(penaltyWin);
  const lost = result.score.user < result.score.opponent || Boolean(
    result.score.penalties && result.score.penalties[0] < result.score.penalties[1],
  );
  const headline = won
    ? "You made history blink."
    : lost
      ? "The champion survives."
      : "History refuses to move.";
  const stars = [...lineup].sort((a, b) => b.overall - a.overall).slice(0, 3);
  const copyText = `Trophy XI ${result.score.user}–${result.score.opponent} Spain 2010\nBuilt with ${stars
    .map((player) => `${player.playerName} ${player.tournamentYear}`)
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1")}.\nCan your XI beat history?`;

  const copyResult = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="game-page game-page--result">
      <GameHeader step="FINAL RECORD" />
      <main className="container result-main">
        <section className={`result-hero result-hero--${won ? "win" : lost ? "loss" : "draw"}`}>
          <div className="result-state">
            <span className="eyebrow eyebrow--gold">
              {won ? "HISTORY BEATEN" : lost ? "HISTORY HOLDS" : "DEADLOCK"}
            </span>
            <h1>{headline}</h1>
            <p>
              Player of the match <b>{result.playerOfTheMatch}</b>
            </p>
          </div>
          <div className="final-score">
            <div>
              <span>YOUR XI</span>
              <b>Trophy XI</b>
            </div>
            <strong>{result.score.user}</strong>
            <i>—</i>
            <strong>{result.score.opponent}</strong>
            <div>
              <span>CHAMPION</span>
              <b>Spain 2010</b>
            </div>
            {result.score.penalties && (
              <small>
                PENALTIES {result.score.penalties[0]}–{result.score.penalties[1]}
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
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
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
            <MatchStats result={result} />
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
              Chemistry rewards shared nations, years, eras, confederations, and correct
              tactical fit. Quality remains the strongest match factor.
            </p>
            <p className="manager-impact"><b>Manager impact:</b> {result.managerImpact}</p>
          </section>
        </div>

        <section className="lineups-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow--gold">TEAM SHEETS</p>
              <h2>Two elevens, one record.</h2>
            </div>
          </div>
          <div className="lineup-grid">
            <article className="lineup-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">
                    YOUR XI / {formation.name} / {era.years} / {manager.managerName}
                  </span>
                  <h3>Trophy XI</h3>
                </div>
                <b>{result.userRatings.overall}</b>
              </div>
              <TacticalPitch formation={formation} lineup={lineup} picks={picks} />
            </article>
            <article className="lineup-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">CHAMPION / {spain2010.formation}</span>
                  <h3>Spain 2010</h3>
                </div>
                <b>{spain2010.ratings.overall}</b>
              </div>
              <TacticalPitch
                formation={getFormation("4-3-3")}
                opponentNames={spain2010.lineup.map((player) => player.name)}
              />
            </article>
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
            <ShareCard result={result} stars={stars} />
            <Button variant="secondary" onClick={copyResult}>
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? "Result copied" : "Copy result text"}
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
