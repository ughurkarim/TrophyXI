"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Gauge, Shield, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TeamRatings } from "@/components/draft/team-ratings";
import { Button } from "@/components/ui/button";
import { flagForCountry } from "@/lib/utils";
import type {
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
  TeamRatings as Ratings,
} from "@/types/game";
import styles from "./champion-reveal.module.css";

export function ChampionReveal({
  opponent,
  userRatings,
  userEra,
  opponentEraFit,
  onSimulate,
}: {
  opponent: HistoricalWorldCupTeam;
  userRatings: Ratings;
  userEra: string;
  opponentEraFit: number;
  onSimulate: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(Boolean(reduceMotion));
  const [launching, setLaunching] = useState(false);
  const launchTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const timeout = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  useEffect(
    () => () => {
      if (launchTimeout.current !== null) {
        window.clearTimeout(launchTimeout.current);
      }
    },
    [],
  );

  const startBroadcast = () => {
    if (launching) return;
    if (reduceMotion) {
      onSimulate();
      return;
    }
    setLaunching(true);
    launchTimeout.current = window.setTimeout(onSimulate, 680);
  };

  return (
    <section
      className="reveal"
      aria-labelledby="reveal-title"
      data-transitioning={launching}
    >
      <div className="reveal__atmosphere" aria-hidden />
      <div className="reveal__topline">
        <span className="eyebrow">OPPONENT REVEAL / KNOCKOUT</span>
        {!ready && (
          <button className="text-button" onClick={() => setReady(true)}>
            Skip reveal
          </button>
        )}
      </div>

      <motion.div
        className="versus-stage"
        data-testid="match-transition"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <motion.article
          className="team-reveal team-reveal--user"
          animate={launching ? { x: -30, opacity: 0.82 } : { x: 0, opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 0.64,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <span className="team-reveal__monogram">XI</span>
          <p>YOUR XI · {userEra}</p>
          <h1 id="reveal-title">Trophy XI</h1>
          <TeamRatings ratings={userRatings} />
        </motion.article>

        <motion.div
          className="versus-mark"
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={
            launching
              ? { scaleX: 0.18, opacity: 0 }
              : { scaleX: 1, scaleY: 1, opacity: 1 }
          }
          transition={{
            delay: launching || reduceMotion ? 0 : 0.3,
            duration: reduceMotion ? 0 : launching ? 0.48 : 0.25,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          VS
        </motion.div>

        <motion.article
          className="team-reveal team-reveal--champion"
          initial={reduceMotion ? false : { opacity: 0, x: 20 }}
          animate={{
            opacity: launching ? 0.82 : ready ? 1 : 0.35,
            x: launching ? 30 : 0,
          }}
          transition={{
            duration: reduceMotion ? 0 : launching ? 0.64 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <span className="team-reveal__flag">
            {opponent.nationCode}{" "}
            <i aria-hidden>{flagForCountry(opponent.nationCode)}</i>
          </span>
          <p>
            {opponent.kind === "all-stars"
              ? "FEATURED CHALLENGE · MYTHIC"
              : opponent.kind === "model"
                ? "TROPHY XI MODEL"
              : `WORLD CUP CHAMPION · ${opponent.tournamentYear}`}
          </p>
          <h2>{opponent.nationName}</h2>
          <TeamRatings
            ratings={{
              ...opponent.ratings,
              chemistry: opponentEraFit,
            }}
          />
        </motion.article>
      </motion.div>

      <motion.section
        className={`opponent-dossier ${styles.dossier}`}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        aria-label={`${opponent.nationName} match dossier`}
      >
        <div className="dossier-badge">
          <Shield size={19} aria-hidden />
          <span>
            <small>DIFFICULTY</small>
            <b>{opponent.difficulty}</b>
          </span>
        </div>
        <div className={styles.tacticalIdentity}>
          <span className="eyebrow">TACTICAL IDENTITY</span>
          <h3>{opponent.tacticalProfile}</h3>
          <p>
            Era Translation {opponentEraFit} · Manager{" "}
            {opponent.managerName ?? opponent.allStars?.manager.managerName}
          </p>
        </div>
        <div className="dossier-facts">
          <span>
            <Gauge size={15} aria-hidden />{" "}
            {opponent.formationLabel ?? opponent.formation}
          </span>
          <span>
            <Sparkles size={15} aria-hidden /> {opponent.ratings.overall} OVR
          </span>
        </div>
        {opponent.championFact && (
          <blockquote className={styles.championFact}>
            {opponent.championFact}
          </blockquote>
        )}
        <div className={styles.squad}>
          <RevealPlayerList
            heading="Starting XI"
            players={opponent.startingLineup}
          />
          <RevealPlayerList
            heading="Available substitutes"
            players={opponent.substitutes}
          />
        </div>
      </motion.section>

      <div className="reveal__action">
        <p>
          <span className="live-dot">READY</span> One seed. One knockout match.
        </p>
        <Button
          onClick={startBroadcast}
          disabled={!ready || launching}
          aria-label={launching ? "Opening live broadcast" : "Simulate match"}
        >
          {launching ? "Opening broadcast" : "Simulate match"}{" "}
          <ArrowRight size={17} aria-hidden />
        </Button>
      </div>
    </section>
  );
}

function RevealPlayerList({
  heading,
  players,
}: {
  heading: string;
  players: HistoricalLineupPlayer[];
}) {
  return (
    <section aria-label={heading}>
      <span className="eyebrow">{heading}</span>
      <ol className={styles.playerList} aria-label={heading}>
        {players.map((player) => (
          <li key={`${player.playerIdentityId}-${player.position}`}>
            <span>{player.position}</span>
            <b>{player.name}</b>
            {player.rating !== undefined && <small>{player.rating}</small>}
          </li>
        ))}
      </ol>
    </section>
  );
}
