"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Shield, Users, X } from "lucide-react";
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
import argentinaLogo from "../../../assets/circlelogo/argentina.png";
import brazilLogo from "../../../assets/circlelogo/brazil.png";
import franceLogo from "../../../assets/circlelogo/france.png";
import germanyLogo from "../../../assets/circlelogo/germany.png";
import italyLogo from "../../../assets/circlelogo/italy.png";
import spainLogo from "../../../assets/circlelogo/spain.png";
import styles from "./champion-reveal.module.css";

type SquadView = "user" | "opponent" | null;

const championLogoByCode: Record<string, string> = {
  ARG: argentinaLogo.src,
  BRA: brazilLogo.src,
  FRA: franceLogo.src,
  GER: germanyLogo.src,
  FRG: germanyLogo.src,
  ITA: italyLogo.src,
  ESP: spainLogo.src,
};

const championLogoByNation: Record<string, string> = {
  argentina: argentinaLogo.src,
  brazil: brazilLogo.src,
  france: franceLogo.src,
  germany: germanyLogo.src,
  "west germany": germanyLogo.src,
  italy: italyLogo.src,
  spain: spainLogo.src,
};

const normalizeNationName = (value: string) => value.trim().toLowerCase();

const formatUserEra = (value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (normalized.includes("all eras") || normalized.includes("neutral")) {
    return "ALL ERAS";
  }

  return trimmed
    .replace(/\s*environment.*$/i, "")
    .replace(/\s*·\s*title.*$/i, "")
    .trim();
};

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

  useEffect(() => {
    // The desktop reveal is a single-screen cinematic. On phones the dossier
    // is intentionally taller than the visual viewport and must use normal
    // document scrolling; locking html/body prevents real Safari touch scroll.
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  const userPlayers = useMemo(
    () =>
      formation
        ? formation.slots.flatMap((slot) => {
            const pick = picks.find((candidate) => candidate.slotId === slot.id);
            const player = pick ? playersById.get(pick.cardId) : undefined;
            return player
              ? [
                  {
                    playerIdentityId: player.playerIdentityId,
                    name: `${player.playerName} ${player.tournamentYear}`,
                    position: slot.position,
                    rating: player.overall,
                  },
                ]
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
      if (launchTimeout.current !== null) window.clearTimeout(launchTimeout.current);
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

  const formationLabel = opponent.formationLabel ?? opponent.formation;
  const managerName = opponent.managerName ?? opponent.allStars?.manager.managerName;
  const opponentLogo =
    championLogoByCode[opponent.nationCode] ??
    championLogoByNation[normalizeNationName(opponent.nationName)];
  const opponentDisplayName =
    opponent.kind === "all-stars" ? "All Stars" : opponent.nationName;
  const userEraLabel = formatUserEra(userEra);

  return (
    <section
      className={`reveal ${styles.reveal}`}
      aria-labelledby="reveal-title"
      data-transitioning={launching}
    >
      <div className={styles.ambient} aria-hidden />

      <motion.div
        className={`versus-stage ${styles.versusStage}`}
        data-testid="match-transition"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.34 }}
      >
        <TeamIdentity
          side="user"
          eyebrow={`YOUR XI · ${userEraLabel}`}
          name="Trophy XI"
          launching={launching}
          ready
          reduceMotion={Boolean(reduceMotion)}
        />

        <div className={styles.versusCenter}>
          <span className={styles.finalKicker}>THE WORLD CUP FINAL</span>
          <motion.div
            className={`versus-mark ${styles.versusMark}`}
            data-testid="final-versus-mark"
            initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
            animate={launching ? { scale: 0.55, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.18, duration: reduceMotion ? 0 : 0.28 }}
          >
            <span>VS</span>
          </motion.div>
        </div>

        <TeamIdentity
          side="opponent"
          eyebrow={
            opponent.kind === "all-stars"
              ? "FEATURED CHALLENGE · MYTHIC"
              : `WORLD CHAMPION · ${opponent.tournamentYear}`
          }
          name={opponentDisplayName}
          countryLogo={opponentLogo}
          fallbackCrest={flagForCountry(opponent.nationCode)}
          isAllStars={opponent.kind === "all-stars"}
          launching={launching}
          ready={ready}
          reduceMotion={Boolean(reduceMotion)}
        />
      </motion.div>

      <motion.section
        className={styles.comparison}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 8 }}
        aria-label="Team ratings comparison"
      >
        <div className={styles.metricTitle}>
          <i />
          <span>TEAM STATS</span>
          <i />
        </div>

        <div className={styles.metricList}>
          {metricRows.map(([label, userValue, opponentValue]) => (
            <div className={styles.metricRow} data-overall={label === "Overall" ? "true" : "false"} key={label}>
              <b>{userValue}</b>
              <MetricBar side="user" value={userValue} />
              <span>{label}</span>
              <MetricBar side="opponent" value={opponentValue} />
              <b>{opponentValue}</b>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className={styles.dossierGrid}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 8 }}
        aria-label={`${opponent.nationName} match dossier`}
      >

        <article className={`${styles.infoCard} ${styles.tacticalCard}`}>
          <div className={styles.tacticalIdentity}>
            <span className={styles.cardEyebrow}>TACTICAL IDENTITY</span>
            <h3>{opponent.tacticalProfile}</h3>
            <div className={styles.tacticalDivider} aria-hidden />
            <p className={styles.tacticalMeta}>
              Manager: {managerName} <i /> {formationLabel} <i />
              {opponentEraFit > 0 ? `Era Fit ${opponentEraFit}` : "Neutral era"}
            </p>
            {opponent.championFact && (
              <p className={styles.championFact}>{opponent.championFact}</p>
            )}
          </div>
        </article>

        <article className={`${styles.infoCard} ${styles.formationCard}`}>
          <div className={styles.formationEmblem} aria-hidden>
            <FormationGlyph />
          </div>
          <div className={styles.formationFacts}>
            <div className={styles.formationPrimary}>
              <span className={styles.cardEyebrow}>FORMATION</span>
              <strong>{formationLabel}</strong>
            </div>
            <div className={styles.opponentOverall}>
              <span className={styles.cardEyebrow}>OPPONENT OVR</span>
              <b>{opponent.ratings.overall}</b>
            </div>
          </div>
        </article>
      </motion.section>

      <div className={`reveal__action ${styles.action}`}>
        <div className={styles.squadActions}>
          <Button
            className={styles.squadButton}
            variant="secondary"
            onClick={() => setSquadView("user")}
          >
            <span className={styles.squadButtonIcon} aria-hidden><Users size={15} /></span>
            <span>View Your XI</span>
          </Button>
          <Button
            className={styles.squadButton}
            variant="secondary"
            onClick={() => setSquadView("opponent")}
          >
            <span className={styles.squadButtonIcon} aria-hidden><Shield size={15} /></span>
            <span>View Opponent XI</span>
          </Button>
        </div>

        <div className={styles.readyBlock}>
          <span className={styles.readyPill}><i /> FINAL READY</span>
          <p>One match for the trophy.</p>
        </div>

        <Button className={styles.simulateButton} onClick={startBroadcast} disabled={!ready || launching}>
          <span>{launching ? "Opening Final" : "Enter Final"}</span>
          <span className={styles.simulateArrow} aria-hidden>
            <ArrowRight size={16} />
          </span>
        </Button>
      </div>

      {squadView && (
        <RevealSquadDrawer
          side={squadView}
          heading={squadView === "user" ? "Trophy XI" : opponent.kind === "all-stars" ? "All Stars" : `${opponent.nationName} ${opponent.tournamentYear ?? ""}`}
          subheading={squadView === "user" ? "YOUR FINAL XI" : `WORLD CHAMPION · ${opponent.tournamentYear ?? ""}`}
          formation={
            squadView === "user"
              ? inferFormationLabel(userPlayers)
              : formationLabel
          }
          players={squadView === "user" ? userPlayers : opponent.startingLineup}
          onClose={() => setSquadView(null)}
        />
      )}
    </section>
  );
}

function MetricBar({
  side,
  value,
}: {
  side: "user" | "opponent";
  value: number;
}) {
  const fillStyle =
    side === "user"
      ? { width: `${value}%`, right: 0, left: "auto" }
      : { width: `${value}%`, left: 0 };

  return (
    <div className={styles.metricBar} data-side={side} aria-hidden>
      <span className={styles.metricFill} style={fillStyle} />
    </div>
  );
}

function TeamIdentity({
  side,
  eyebrow,
  name,
  countryLogo,
  fallbackCrest,
  isAllStars = false,
  launching,
  ready,
  reduceMotion,
}: {
  side: "user" | "opponent";
  eyebrow: string;
  name: string;
  countryLogo?: string;
  fallbackCrest?: string;
  isAllStars?: boolean;
  launching: boolean;
  ready: boolean;
  reduceMotion: boolean;
}) {
  return (
    <motion.article
      className={`${styles.team} ${side === "opponent" ? styles.opponent : styles.user}`}
      data-testid={`${side}-final-team`}
      data-long-name={side === "opponent" && name.length >= 11 ? "true" : "false"}
      animate={{
        opacity: launching ? 0.72 : ready ? 1 : 0.36,
        x: launching ? (side === "user" ? -28 : 28) : 0,
      }}
      transition={{ duration: reduceMotion ? 0 : 0.45 }}
    >
      <div className={styles.crestShell} data-side={side}>
        <div className={styles.crestInner}>
          {side === "user" ? (
            <RegalXiMark />
          ) : isAllStars ? (
            <span
              role="img"
              aria-label="All Stars logo"
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                width: "100%",
                height: "100%",
                lineHeight: 1,
                fontSize: "2rem",
                color: "#e8c763",
                textShadow:
                  "0 0 6px rgba(235, 195, 80, 0.42), 0 0 16px rgba(218, 171, 53, 0.18)",
                transform: "translateY(-1px)",
              }}
            >
              ✦
            </span>
          ) : countryLogo ? (
            <img className={styles.countryLogo} src={countryLogo} alt={`${name} crest`} />
          ) : (
            <span className={styles.opponentCrest}>{fallbackCrest}</span>
          )}
        </div>
      </div>

      <div className={styles.teamCopy}>
        <p>{eyebrow}</p>
        {side === "user" ? <h1 id="reveal-title">{name}</h1> : <h2>{name}</h2>}
      </div>
    </motion.article>
  );
}

function RegalXiMark() {
  return (
    <span className={styles.regalXiMark} role="img" aria-label="Trophy XI">
      XI
    </span>
  );
}

function FormationGlyph() {
  return (
    <span className={styles.formationBadge} aria-hidden>
      <span className={styles.formationPitch}>
        <span className={styles.formationPitchMidline} />
        <span className={styles.formationPitchCircle} />
        <span className={styles.formationPitchBoxTop} />
        <span className={styles.formationPitchBoxBottom} />
      </span>
    </span>
  );
}

type PitchRole = "gk" | "def" | "mid" | "att";

type PitchPlayer = HistoricalLineupPlayer & {
  pitchX: number;
  pitchY: number;
};

type LineTemplate = {
  x: number[];
  y: number[];
};

function pitchRoleForPosition(position: string): PitchRole {
  const normalized = position.trim().toUpperCase();

  if (normalized === "GK") return "gk";
  if (/^(ST|CF|SS|LF|RF|LW|RW|FW)$/.test(normalized)) return "att";
  if (/^(LB|RB|CB|LCB|RCB|SW)$/.test(normalized)) return "def";
  return "mid";
}

function horizontalBiasForPosition(position: string) {
  const normalized = position.trim().toUpperCase();
  if (/^(LB|LWB|LM|LW|LF|LCB)$/.test(normalized)) return -1;
  if (/^(RB|RWB|RM|RW|RF|RCB)$/.test(normalized)) return 1;
  return 0;
}

function templateForRole(role: PitchRole, count: number): LineTemplate {
  if (role === "gk") {
    return { x: [50], y: [86] };
  }

  const templates: Record<PitchRole, Record<number, LineTemplate>> = {
    att: {
      1: { x: [50], y: [14] },
      2: { x: [36, 64], y: [16, 16] },
      3: { x: [23, 50, 77], y: [16, 13, 16] },
      4: { x: [16, 39, 61, 84], y: [16, 13, 13, 16] },
      5: { x: [12, 31, 50, 69, 88], y: [17, 14, 12, 14, 17] },
    },
    mid: {
      1: { x: [50], y: [47] },
      2: { x: [34, 66], y: [46, 46] },
      3: { x: [28, 50, 72], y: [42, 48, 42] },
      4: { x: [18, 40, 60, 82], y: [42, 48, 48, 42] },
      5: { x: [15, 32, 50, 68, 85], y: [39, 44, 49, 44, 39] },
    },
    def: {
      1: { x: [50], y: [71] },
      2: { x: [36, 64], y: [72, 72] },
      3: { x: [24, 50, 76], y: [69, 74, 69] },
      4: { x: [17, 39, 61, 83], y: [68, 72, 72, 68] },
      5: { x: [13, 31, 50, 69, 87], y: [66, 70, 73, 70, 66] },
    },
    gk: { 1: { x: [50], y: [86] } },
  };

  return templates[role][count] ?? {
    x: Array.from({ length: count }, (_, index) => ((index + 1) / (count + 1)) * 100),
    y: Array.from({ length: count }, () => (role === "att" ? 14 : role === "mid" ? 46 : 71)),
  };
}

function buildPitchLayout(players: HistoricalLineupPlayer[]): PitchPlayer[] {
  const indexed = players.slice(0, 11).map((player, index) => ({ player, index }));
  const roles: PitchRole[] = ["att", "mid", "def", "gk"];
  const placed: PitchPlayer[] = [];

  for (const role of roles) {
    const line = indexed
      .filter(({ player }) => pitchRoleForPosition(player.position) === role)
      .sort((a, b) => {
        const biasDifference = horizontalBiasForPosition(a.player.position) - horizontalBiasForPosition(b.player.position);
        return biasDifference || a.index - b.index;
      });

    const template = templateForRole(role, line.length);

    line.forEach(({ player }, index) => {
      placed.push({
        ...player,
        pitchX: template.x[index] ?? 50,
        pitchY: template.y[index] ?? (role === "gk" ? 86 : role === "def" ? 71 : role === "mid" ? 46 : 14),
      });
    });
  }

  return placed;
}

function inferFormationLabel(players: HistoricalLineupPlayer[]) {
  const counts = players.slice(0, 11).reduce(
    (acc, player) => {
      const role = pitchRoleForPosition(player.position);
      if (role !== "gk") acc[role] += 1;
      return acc;
    },
    { def: 0, mid: 0, att: 0 },
  );

  return counts.def + counts.mid + counts.att === 10
    ? `${counts.def}-${counts.mid}-${counts.att}`
    : "STARTING XI";
}

function compactPitchName(name: string) {
  return name.length > 18 ? name.replace(/\s+\d{4}$/, "") : name;
}

function RevealSquadDrawer({
  side,
  heading,
  subheading,
  formation,
  players,
  onClose,
}: {
  side: Exclude<SquadView, null>;
  heading: string;
  subheading: string;
  formation: string;
  players: HistoricalLineupPlayer[];
  onClose: () => void;
}) {
  const pitchPlayers = buildPitchLayout(players);

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.squadDrawer}
        data-side={side}
        role="dialog"
        aria-modal="true"
        aria-label={`${heading} starting eleven`}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header className={styles.pitchHeader}>
          <div className={styles.pitchTitleBlock}>
            <span>{subheading}</span>
            <h2>{heading}</h2>
          </div>

          <div className={styles.pitchHeaderRight}>
            <span className={styles.formationChip}>{formation}</span>
            <button className={styles.pitchClose} onClick={onClose} aria-label="Close lineup" autoFocus>
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>

        <div className={styles.pitchShell}>
          <div className={styles.pitchSurface} aria-label={`${heading} ${formation} formation`}>
            <span className={styles.pitchHalfway} aria-hidden />
            <span className={styles.pitchCenterCircle} aria-hidden />
            <span className={`${styles.penaltyArea} ${styles.penaltyAreaTop}`} aria-hidden />
            <span className={`${styles.penaltyArea} ${styles.penaltyAreaBottom}`} aria-hidden />
            <span className={`${styles.goalArea} ${styles.goalAreaTop}`} aria-hidden />
            <span className={`${styles.goalArea} ${styles.goalAreaBottom}`} aria-hidden />
            <span className={`${styles.goal} ${styles.goalTop}`} aria-hidden />
            <span className={`${styles.goal} ${styles.goalBottom}`} aria-hidden />

            {pitchPlayers.map((player, index) => {
              const displayName = compactPitchName(player.name);

              return (
                <div
                  className={styles.pitchPlayer}
                  data-long={displayName.length > 16 ? "true" : "false"}
                  key={`${player.playerIdentityId}-${player.position}-${index}`}
                  style={{ left: `${player.pitchX}%`, top: `${player.pitchY}%` }}
                >
                  <div className={styles.pitchPlayerMeta}>
                    <span>{formatLineupPosition(player.position)}</span>
                    {player.rating !== undefined && <small>{player.rating}</small>}
                  </div>
                  <b title={player.name}>{displayName}</b>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function formatLineupPosition(position: string) {
  if (position === "LCB" || position === "RCB") return "CB";
  return position;
}
