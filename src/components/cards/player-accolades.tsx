"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Gem, Trophy } from "lucide-react";
import type { PlayerTournamentCard } from "@/types/game";

export const accoladeTransition = (
  reduceMotion: boolean | null,
  index: number,
) => ({
  duration: reduceMotion ? 0 : 0.2,
  delay: reduceMotion ? 0 : index * 0.07,
});

export function PlayerAccolades({
  player,
  compact = false,
}: {
  player: PlayerTournamentCard;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const careerItems = [
    ...(player.top100Player
      ? [
          {
            id: "top-100-player",
            label: "TOP 100 PLAYER",
            count: null,
            description:
              "Curated Trophy XI recognition, assigned independently of card rating.",
            source: null,
            premium: true,
          },
        ]
      : []),
    ...player.careerAccolades.map((accolade) => ({
      ...accolade,
      premium: false,
    })),
  ];
  const animationLimit = 6;
  const visibleCareer = careerItems.slice(0, animationLimit);
  const remainingCareer = careerItems.slice(animationLimit);
  const tournamentAnimationSlots = Math.max(
    0,
    animationLimit - visibleCareer.length,
  );
  const visibleTournament = player.achievements.slice(
    0,
    tournamentAnimationSlots,
  );
  const remainingTournament = player.achievements.slice(
    tournamentAnimationSlots,
  );

  return (
    <div
      className={`player-accolades${compact ? " player-accolades--compact" : ""}`}
    >
      <section aria-labelledby={`career-accolades-${player.id}`}>
        <span className="eyebrow" id={`career-accolades-${player.id}`}>
          CAREER ACCOLADES
        </span>
        {careerItems.length ? (
          <ul className="achievement-list">
            {visibleCareer.map((accolade, index) => (
              <motion.li
                key={accolade.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={accoladeTransition(reduceMotion, index)}
                className={
                  accolade.premium
                    ? "achievement-list__top100"
                    : index === 0
                      ? "achievement-list__primary"
                      : undefined
                }
              >
                {accolade.premium ? (
                  <Gem size={14} aria-hidden />
                ) : (
                  <Trophy size={14} aria-hidden />
                )}
                <b>
                  {accolade.count === null ? "" : `${accolade.count}× `}
                  {accolade.label}
                </b>
                <p>{accolade.description}</p>
                {accolade.source && (
                  <a
                    href={accolade.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {accolade.source.publisher}
                  </a>
                )}
              </motion.li>
            ))}
            {remainingCareer.length > 0 && (
              <li className="achievement-list__more">
                <b>More Honors</b>
                <p>
                  {remainingCareer
                    .map(
                      (accolade) =>
                        `${accolade.count === null ? "" : `${accolade.count}× `}${accolade.label}`,
                    )
                    .join(" · ")}
                </p>
              </li>
            )}
          </ul>
        ) : (
          <p className="data-disclosure">
            No verified career accolade is stored for this identity.
          </p>
        )}
      </section>

      {player.achievements.length > 0 && (
        <section aria-labelledby={`tournament-accolades-${player.id}`}>
          <span className="eyebrow" id={`tournament-accolades-${player.id}`}>
            TOURNAMENT ACCOLADES
          </span>
          <ul className="achievement-list achievement-list--tournament">
            {visibleTournament.map((achievement, index) => (
              <motion.li
                key={achievement.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={accoladeTransition(
                  reduceMotion,
                  visibleCareer.length + index,
                )}
              >
                <Award size={14} aria-hidden />
                <b>{achievement.label}</b>
                <p>{achievement.description}</p>
                <a
                  href={achievement.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {achievement.source.publisher}
                </a>
              </motion.li>
            ))}
            {remainingTournament.length > 0 && (
              <li className="achievement-list__more">
                <b>More Honors</b>
                <p>
                  {remainingTournament
                    .map((achievement) => achievement.label)
                    .join(" · ")}
                </p>
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
