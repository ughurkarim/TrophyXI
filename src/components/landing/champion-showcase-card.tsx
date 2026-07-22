"use client";

import Image from "next/image";
import { useState } from "react";
import type { LandingChampion } from "@/data/landing-champions";
import { assetUrl } from "@/lib/assets";
import { flagForCountry } from "@/lib/utils";
import styles from "./champion-showcase-card.module.css";

export function ChampionShowcaseCard({
  champion,
  index,
  total,
}: {
  champion: LandingChampion;
  index: number;
  total: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(champion.representativeImage) && !imageFailed;
  const ordinal = String(index + 1).padStart(2, "0");
  const initials =
    champion.status === "pending"
      ? "TBC"
      : champion.representativePlayer
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 3)
          .toUpperCase();

  return (
    <article
      className={styles.card}
      aria-label={
        champion.status === "pending"
          ? `${champion.tournamentYear} world champion pending confirmation`
          : `${champion.nationName} ${champion.tournamentYear} world champion, represented by ${champion.representativePlayer}`
      }
    >
      <div className={styles.content}>
        <div className={styles.kicker}>
          <span>
            WORLD CHAMPION
            {champion.status === "pending" ? " · PENDING" : ""}
          </span>
          <span aria-hidden>
            {ordinal} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <div className={styles.countryLockup}>
          <p className={styles.countryCode}>
            <span aria-hidden>{flagForCountry(champion.nationCode)}</span>
            {champion.nationCode}
          </p>
          <p className={styles.year}>{champion.tournamentYear}</p>
          <h3>{champion.nationName}</h3>
        </div>

        <div className={styles.playerLockup}>
          <span>REPRESENTATIVE PLAYER</span>
          <strong>{champion.representativePlayer}</strong>
        </div>

        <p className={styles.fact}>{champion.championFact}</p>
        <p className={styles.tacticalLabel}>{champion.tacticalLabel}</p>
      </div>

      <div
        className={styles.media}
        data-image-status={hasImage ? "ready" : "pending"}
      >
        <span className={styles.playerAura} aria-hidden />
        <div
          className={styles.pending}
          role={hasImage ? undefined : "img"}
          aria-label={
            hasImage
              ? undefined
              : `${champion.representativePlayer} ${champion.tournamentYear} photo pending`
          }
          aria-hidden={hasImage || undefined}
        >
          <span aria-hidden>{champion.tournamentYear}</span>
          <i aria-hidden>{initials}</i>
          <strong>PHOTO PENDING</strong>
          <small>
            <span aria-hidden>{flagForCountry(champion.nationCode)}</span>{" "}
            {champion.representativePlayer}
          </small>
        </div>
        {hasImage && champion.representativeImage ? (
          <Image
            className={styles.image}
            src={assetUrl(champion.representativeImage)}
            alt={`${champion.representativePlayer} celebrates ${champion.nationName}’s ${champion.tournamentYear} World Cup victory`}
            fill
            unoptimized
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 52vw, 620px"
            style={{ objectPosition: champion.imagePosition }}
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className={styles.mediaShade} aria-hidden />
      </div>
    </article>
  );
}
