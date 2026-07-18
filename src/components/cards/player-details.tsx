"use client";

import { X } from "lucide-react";
import { PlayerPortrait } from "@/components/cards/player-portrait";
import { players } from "@/data/players";
import type { PlayerTournamentCard } from "@/types/game";
import { flagForCountry } from "@/lib/utils";

const statLabels: Array<
  [keyof PlayerTournamentCard["tournamentStats"], string]
> = [
  ["appearances", "Appearances"],
  ["starts", "Starts"],
  ["minutes", "Minutes"],
  ["goals", "Goals"],
  ["assists", "Assists"],
  ["cleanSheets", "Clean sheets"],
  ["saves", "Saves"],
];

export function PlayerDetails({
  player,
  onClose,
}: {
  player: PlayerTournamentCard;
  onClose: () => void;
}) {
  const versions = players
    .filter(
      (candidate) =>
        candidate.playerIdentityId === player.playerIdentityId,
    )
    .sort(
      (first, second) => second.tournamentYear - first.tournamentYear,
    );
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="player-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="icon-button player-drawer__close"
          onClick={onClose}
          aria-label="Close player record"
          autoFocus
        >
          <X size={18} aria-hidden />
        </button>
        <div className="player-drawer__hero">
          <PlayerPortrait player={player} />
          <div>
            <span className="eyebrow eyebrow--gold">
              {flagForCountry(player.countryCode)} {player.countryName} · {player.tournamentYear}
            </span>
            <h2 id="player-detail-title">{player.playerName}</h2>
            <p>{player.archetype} · {player.primaryPosition} · {player.qualityBand}</p>
          </div>
        </div>
        <section>
          <span className="eyebrow">TOURNAMENT VERSIONS</span>
          <p className="data-disclosure">
            {versions
              .map((version) => version.tournamentYear)
              .join(" · ")}
          </p>
        </section>
        <section>
          <span className="eyebrow">TOURNAMENT RECORD</span>
          <dl className="record-grid">
            {statLabels.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{player.tournamentStats[key] ?? "Not sourced"}</dd>
              </div>
            ))}
          </dl>
          {player.statSources.length === 0 && (
            <p className="data-disclosure">
              No verified tournament stat line is stored for this version. Unknown values
              stay unknown and never become zero.
            </p>
          )}
        </section>
        <section>
          <span className="eyebrow">ACHIEVEMENTS</span>
          {player.achievements.length ? (
            <ul className="achievement-list">
              {player.achievements.map((achievement) => (
                <li key={achievement.id}>
                  <b>{achievement.label}</b>
                  <p>{achievement.description}</p>
                  <a href={achievement.source.url} target="_blank" rel="noreferrer">
                    {achievement.source.publisher}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="data-disclosure">
              No named achievement is shown without a card-level citation.
            </p>
          )}
        </section>
        <p className="rating-disclosure">
          Overall and attribute values are original Trophy XI game estimates—not
          official FIFA ratings or factual career statistics.
        </p>
      </aside>
    </div>
  );
}
