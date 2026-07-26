"use client";

import type { CSSProperties } from "react";
import type { TeamRatings as TeamRatingsModel } from "@/types/game";
import styles from "./team-ratings.module.css";

const clampPercent = (value: number | undefined) =>
  Math.max(0, Math.min(100, Math.round(value ?? 0)));

const chemistryLabel = (score: number) => {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "BALANCED";
  if (score >= 40) return "DEVELOPING";
  return "DISCONNECTED";
};

const legacyTier = (score: number) => {
  if (score >= 85) return { key: "immortal", label: "IMMORTAL" };
  if (score >= 73) return { key: "legendary", label: "LEGENDARY" };
  if (score >= 60) return { key: "decorated", label: "DECORATED" };
  if (score >= 45) return { key: "established", label: "ESTABLISHED" };
  return { key: "building", label: "BUILDING" };
};

const widthStyle = (value: number): CSSProperties =>
  ({ "--rating-fill": `${clampPercent(value)}%` }) as CSSProperties;

const RatingOrb = ({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) => (
  <div className={styles.ratingOrb} data-emphasis={emphasis || undefined}>
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);

const ChemistryFactor = ({
  label,
  weight,
  value,
}: {
  label: string;
  weight: number;
  value: number;
}) => (
  <div className={styles.chemFactor}>
    <div className={styles.factorHeading}>
      <span>{label}</span>
      <small>{weight}%</small>
      <b>{clampPercent(value)}</b>
    </div>
    <div
      className={styles.factorTrack}
      style={widthStyle(value)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampPercent(value)}
      aria-label={`${label}: ${clampPercent(value)} out of 100`}
    >
      <span />
    </div>
  </div>
);

type TeamRatingsProps = {
  ratings: TeamRatingsModel;
  /**
   * Kept for draft screens that explicitly request the full ratings presentation.
   * The current component is already the full presentation, but accepting this
   * prop preserves the shared API used by Classic Draft.
   */
  expanded?: boolean;
};

export function TeamRatings({
  ratings,
  expanded = false,
}: TeamRatingsProps) {
  const legacyScore = clampPercent(ratings.legacyScore);
  const legacyBonus = Math.max(0, Math.min(4, ratings.legacyBonus ?? 0));
  const tier = legacyTier(legacyScore);
  const coreOverall = Math.round(
    ratings.coreOverall ??
      (ratings.playerQuality ?? ratings.overall) * 0.5 +
        ratings.positionFit * 0.3 +
        ratings.chemistry * 0.2,
  );

  const chemistryFactors = [
    {
      label: "COHESION",
      weight: 55,
      value: ratings.playerCohesion ?? ratings.chemistry,
    },
    { label: "MANAGER", weight: 25, value: ratings.managerFit },
    { label: "BALANCE", weight: 15, value: ratings.tacticalBalance },
    { label: "ERA", weight: 5, value: ratings.eraFit },
  ];

  return (
    <section
      className={styles.shell}
      data-expanded={expanded || undefined}
      aria-label="Trophy XI squad rating"
    >
      <div className={styles.orbRow}>
        <RatingOrb label="ATK" value={ratings.attack} />
        <RatingOrb label="MID" value={ratings.midfield} />
        <RatingOrb label="DEF" value={ratings.defense} />
        <RatingOrb label="CHEM" value={ratings.chemistry} />
        <RatingOrb label="OVR" value={ratings.overall} emphasis />
      </div>

      <div className={styles.modelGrid}>
        <article
          className={styles.legacyCard}
          data-legacy-tier={tier.key}
          data-boost={legacyBonus}
        >
          <header className={styles.cardHeading}>
            <div>
              <span className={styles.kicker}>SQUAD LEGACY</span>
              <div className={styles.legacyTitle}>
                <strong>{legacyScore}</strong>
                <small>/100</small>
                <em>{tier.label}</em>
              </div>
            </div>
            <div className={styles.legacyBoost} data-boost={legacyBonus}>
              <span>OVR BOOST</span>
              <strong>+{legacyBonus}</strong>
            </div>
          </header>

          <div
            className={styles.legacyTrack}
            style={widthStyle(legacyScore)}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={legacyScore}
            aria-label={`Squad legacy: ${legacyScore} out of 100, plus ${legacyBonus} overall`}
          >
            <span className={styles.legacyFill} />
            <i className={styles.legacySpark} aria-hidden />
          </div>

          <div className={styles.legacyThresholds} aria-hidden>
            <span>0</span>
            <span>45 <b>+1</b></span>
            <span>60 <b>+2</b></span>
            <span>73 <b>+3</b></span>
            <span>85 <b>+4</b></span>
            <span>100</span>
          </div>

          <p className={styles.legacyNote}>
            CAREER ACCOLADES · SAME LEGACY ON EVERY TOURNAMENT CARD
          </p>
        </article>

        <article className={styles.chemistryCard}>
          <header className={styles.cardHeading}>
            <div>
              <span className={styles.kicker}>CHEMISTRY</span>
              <div className={styles.chemistryTitle}>
                <strong>{ratings.chemistry}</strong>
                <em>{chemistryLabel(ratings.chemistry)}</em>
              </div>
            </div>
            <small className={styles.formulaHint}>55 / 25 / 15 / 5</small>
          </header>

          <div className={styles.chemistryFactors}>
            {chemistryFactors.map((factor) => (
              <ChemistryFactor key={factor.label} {...factor} />
            ))}
          </div>
        </article>
      </div>

      <div className={styles.overallFormula} aria-label="Overall rating formula">
        <div className={styles.coreInputs}>
          <span>
            QUALITY <b>{clampPercent(ratings.playerQuality)}</b>
            <small>50%</small>
          </span>

          <span
            className={styles.positionFitBadge}
            title={`Position fit ${ratings.positionFit}% · 30% of core OVR`}
            aria-label={`Position fit ${ratings.positionFit} percent`}
          >
            {ratings.positionFit}%
          </span>

          <span>
            CHEM <b>{ratings.chemistry}</b>
            <small>20%</small>
          </span>
        </div>

        <div className={styles.equation}>
          <span>
            CORE <b>{coreOverall}</b>
          </span>
          <i>+</i>
          <span className={styles.equationLegacy} data-boost={legacyBonus}>
            LEGACY <b>+{legacyBonus}</b>
          </span>
          <i>=</i>
          <span className={styles.equationOverall}>
            OVR <b>{ratings.overall}</b>
          </span>
        </div>
      </div>
    </section>
  );
}