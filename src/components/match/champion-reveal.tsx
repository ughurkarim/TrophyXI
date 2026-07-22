"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, Gauge, Shield, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFormation } from "@/data/formations";
import { playersById } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import type {
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
  TeamRatings as Ratings,
} from "@/types/game";
import styles from "./champion-reveal.module.css";

type SquadView = "user" | "opponent" | null;

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
  const [squadView, setSquadView] = useState<SquadView>(null);
  const launchTimeout = useRef<number | null>(null);
  const formationId = useGameStore((state) => state.formationId);
  const picks = useGameStore((state) => state.picks);
  const formation = formationId ? getFormation(formationId) : null;
  const userPlayers = useMemo(
    () =>
      formation
        ? formation.slots.flatMap((slot) => {
            const pick = picks.find((candidate) => candidate.slotId === slot.id);
            const player = pick ? playersById.get(pick.cardId) : undefined;
            return player
              ? [{
                  playerIdentityId: player.playerIdentityId,
                  name: `${player.playerName} ${player.tournamentYear}`,
                  position: slot.position,
                  rating: player.overall,
                }]
              : [];
          })
        : [],
    [formation, picks],
  );

  useEffect(() => {
    if (reduceMotion) return;
    const timeout = window.setTimeout(() => setReady(true), 720);
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

  const opponentChemistry = opponent.allStars?.chemistry ?? 86;
  const metricRows = [
    ["Attack", userRatings.attack, opponent.ratings.attack],
    ["Midfield", userRatings.midfield, opponent.ratings.midfield],
    ["Defense", userRatings.defense, opponent.ratings.defense],
    ["Chemistry", userRatings.chemistry, opponentChemistry],
    ["Overall", userRatings.overall, opponent.ratings.overall],
  ] as const;

  return (
    <section
      className={`reveal ${styles.reveal}`}
      aria-labelledby="reveal-title"
      data-transitioning={launching}
    >
      <div className="reveal__atmosphere" aria-hidden />
      <div className={`reveal__topline ${styles.topline}`}>
        <span className="eyebrow">OPPONENT REVEAL / KNOCKOUT</span>
        {!ready && (
          <button className="text-button" onClick={() => setReady(true)}>
            Skip reveal
          </button>
        )}
      </div>

      <motion.div
        className={`versus-stage ${styles.versusStage}`}
        data-testid="match-transition"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.34 }}
      >
        <TeamIdentity
          side="user"
          eyebrow={`YOUR XI · ${userEra}`}
          name="Trophy XI"
          crest="XI"
          launching={launching}
          ready
          reduceMotion={Boolean(reduceMotion)}
        />
        <motion.div
          className={`versus-mark ${styles.versusMark}`}
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={launching ? { scale: 0.4, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.25 }}
        >
          VS
        </motion.div>
        <TeamIdentity
          side="opponent"
          eyebrow={
            opponent.kind === "all-stars"
              ? "FEATURED CHALLENGE · MYTHIC"
              : `WORLD CHAMPION · ${opponent.tournamentYear}`
          }
          name={opponent.nationName}
          crest={flagForCountry(opponent.nationCode)}
          launching={launching}
          ready={ready}
          reduceMotion={Boolean(reduceMotion)}
        />
      </motion.div>

      <motion.section
        className={styles.comparison}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        aria-label="Team ratings comparison"
      >
        <div className={styles.metricHeader}>
          <b>TXI</b><span>TEAM METRICS</span><b>{opponent.kind === "all-stars" ? "ALL" : opponent.nationCode}</b>
        </div>
        {metricRows.map(([label, userValue, opponentValue]) => (
          <div className={styles.metricRow} key={label}>
            <b data-stronger={userValue > opponentValue}>{userValue}</b>
            <span>{label}</span>
            <i aria-hidden><em style={{ left: `${Math.min(userValue, opponentValue)}%`, width: `${Math.abs(userValue - opponentValue)}%` }} /></i>
            <b data-stronger={opponentValue > userValue}>{opponentValue}</b>
          </div>
        ))}
      </motion.section>

      <motion.section
        className={`opponent-dossier ${styles.dossier}`}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        aria-label={`${opponent.nationName} match dossier`}
      >
        <div className="dossier-badge">
          <Shield size={18} aria-hidden />
          <span><small>DIFFICULTY</small><b>{opponent.difficulty}</b></span>
        </div>
        <div className={styles.tacticalIdentity}>
          <span className="eyebrow">TACTICAL IDENTITY</span>
          <h3>{opponent.tacticalProfile}</h3>
          <p>
            Manager {opponent.managerName ?? opponent.allStars?.manager.managerName} · {opponent.formationLabel ?? opponent.formation}
            {opponentEraFit > 0 ? ` · Era Fit ${opponentEraFit}` : " · Neutral era — no era modifier"}
          </p>
        </div>
        <div className="dossier-facts">
          <span><Gauge size={14} aria-hidden /> {opponent.formationLabel ?? opponent.formation}</span>
          <span><Sparkles size={14} aria-hidden /> {opponent.ratings.overall} OVR</span>
        </div>
        {opponent.championFact && (
          <blockquote className={styles.championFact}>{opponent.championFact}</blockquote>
        )}
      </motion.section>

      <div className={`reveal__action ${styles.action}`}>
        <div className={styles.squadActions}>
          <Button variant="secondary" onClick={() => setSquadView("user")}>
            <Eye size={15} aria-hidden /> View Your XI
          </Button>
          <Button variant="secondary" onClick={() => setSquadView("opponent")}>
            <Eye size={15} aria-hidden /> View Opponent XI
          </Button>
        </div>
        <p><span className="live-dot">READY</span> One seed. One knockout match.</p>
        <Button onClick={startBroadcast} disabled={!ready || launching}>
          {launching ? "Opening broadcast" : "Simulate match"} <ArrowRight size={17} aria-hidden />
        </Button>
      </div>

      {squadView && (
        <RevealSquadDrawer
          heading={squadView === "user" ? "Trophy XI" : `${opponent.nationName} ${opponent.tournamentYear ?? ""}`}
          players={squadView === "user" ? userPlayers : opponent.startingLineup}
          substitutes={squadView === "opponent" ? opponent.substitutes : []}
          onClose={() => setSquadView(null)}
        />
      )}
    </section>
  );
}

function TeamIdentity({
  side,
  eyebrow,
  name,
  crest,
  launching,
  ready,
  reduceMotion,
}: {
  side: "user" | "opponent";
  eyebrow: string;
  name: string;
  crest: string;
  launching: boolean;
  ready: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.article
      className={`team-reveal ${styles.team} ${side === "opponent" ? styles.opponent : styles.user}`}
      animate={{ opacity: launching ? 0.75 : ready ? 1 : 0.36, x: launching ? (side === "user" ? -24 : 24) : 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.45 }}
    >
      <span className={side === "user" ? "team-reveal__monogram" : "team-reveal__flag"}>{crest}</span>
      <p>{eyebrow}</p>
      {side === "user" ? <h1 id="reveal-title">{name}</h1> : <h2>{name}</h2>}
    </motion.article>
  );
}

function RevealSquadDrawer({
  heading,
  players,
  substitutes,
  onClose,
}: {
  heading: string;
  players: HistoricalLineupPlayer[];
  substitutes: HistoricalLineupPlayer[];
  onClose: () => void;
}) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.squadDrawer}
        role="dialog"
        aria-modal="true"
        aria-label={`${heading} lineup`}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
      >
        <header><div><span className="eyebrow eyebrow--gold">TEAM SHEET</span><h2>{heading}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close lineup" autoFocus><X size={17} aria-hidden /></button></header>
        <RevealPlayerList heading="Starting XI" players={players} />
        {substitutes.length > 0 && <RevealPlayerList heading="Available substitutes" players={substitutes} />}
      </aside>
    </div>
  );
}

function RevealPlayerList({ heading, players }: { heading: string; players: HistoricalLineupPlayer[] }) {
  return (
    <section aria-label={heading}>
      <span className="eyebrow">{heading}</span>
      <ol className={styles.playerList} aria-label={heading}>
        {players.map((player) => (
          <li key={`${player.playerIdentityId}-${player.position}`}><span>{player.position === "LCB" || player.position === "RCB" ? "CB" : player.position}</span><b>{player.name}</b>{player.rating !== undefined && <small>{player.rating}</small>}</li>
        ))}
      </ol>
    </section>
  );
}
