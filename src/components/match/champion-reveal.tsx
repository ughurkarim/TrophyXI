"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Gauge, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { TeamRatings } from "@/components/draft/team-ratings";
import { Button } from "@/components/ui/button";
import { flagForCountry } from "@/lib/utils";
import type {
  HistoricalWorldCupTeam,
  TeamRatings as Ratings,
} from "@/types/game";

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

  useEffect(() => {
    if (reduceMotion) return;
    const timeout = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <section className="reveal" aria-labelledby="reveal-title">
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
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <article className="team-reveal team-reveal--user">
          <span className="team-reveal__monogram">XI</span>
          <p>YOUR XI · {userEra}</p>
          <h1 id="reveal-title">Trophy XI</h1>
          <TeamRatings ratings={userRatings} />
        </article>

        <motion.div
          className="versus-mark"
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.3, duration: 0.25 }}
        >
          VS
        </motion.div>

        <motion.article
          className="team-reveal team-reveal--champion"
          initial={reduceMotion ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: ready ? 1 : 0.35, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className="team-reveal__flag">
            {opponent.nationCode}{" "}
            <i aria-hidden>{flagForCountry(opponent.nationCode)}</i>
          </span>
          <p>
            {opponent.kind === "all-stars"
              ? "FEATURED CHALLENGE · MYTHIC"
              : `HISTORICAL OPPONENT · ${
                  opponent.tournamentFinish ?? "Tournament in progress"
                } · ${opponent.tournamentYear}`}
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

      <motion.div
        className="opponent-dossier"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
      >
        <div className="dossier-badge">
          <Shield size={19} aria-hidden />
          <span>
            <small>DIFFICULTY</small>
          <b>{opponent.difficulty}</b>
          </span>
        </div>
        <div>
          <span className="eyebrow">TACTICAL IDENTITY</span>
          <h3>{opponent.tacticalProfile}</h3>
          <p>
            Trophy XI tactical model · opponent Era Translation {opponentEraFit}.
            Manager: {opponent.managerName ?? "not sourced in the current dataset"}.
            {opponent.allStars
              ? ` ${opponent.allStars.manager.compositeLabel}`
              : ""}
          </p>
        </div>
        <div className="dossier-facts">
          <span>
            <Gauge size={15} aria-hidden /> {opponent.formation}
          </span>
          <span>
            <Sparkles size={15} aria-hidden /> {opponent.ratings.overall} OVR
          </span>
        </div>
      </motion.div>

      <div className="reveal__action">
        <p>
          <span className="live-dot">READY</span> One seed. One knockout match.
        </p>
        <Button onClick={onSimulate} disabled={!ready}>
          Simulate match <ArrowRight size={17} aria-hidden />
        </Button>
      </div>
    </section>
  );
}
