"use client";

import Image from "next/image";
import { useState } from "react";
import type { LandingChampion } from "@/data/landing-champions";
import { assetUrl } from "@/lib/assets";
import { flagForCountry } from "@/lib/utils";
import styles from "./champion-showcase-card.module.css";
import { useTranslations } from "next-intl";
import { useLocalizedContent } from "@/i18n/content";

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
  const t = useTranslations("champions");
  const localize = useLocalizedContent();
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
          ? t("pendingShowcaseAria", { year: champion.tournamentYear })
          : t("cardAria", { country: localize(champion.nationName), year: champion.tournamentYear, player: champion.representativePlayer })
      }
    >
      <div className={styles.content}>
        <div className={styles.kicker}>
          <span>
            {t("worldChampion")}
            {champion.status === "pending" ? ` · ${t("pending")}` : ""}
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
          <h3>{localize(champion.nationName)}</h3>
        </div>

        <div className={styles.playerLockup}>
          <span>{t("representativePlayer")}</span>
          <strong>{champion.representativePlayer}</strong>
        </div>

        <p className={styles.fact}>{localize(champion.championFact)}</p>
        <p className={styles.tacticalLabel}>{localize(champion.tacticalLabel)}</p>
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
              : t("photoPendingAria", { player: champion.representativePlayer, year: champion.tournamentYear })
          }
          aria-hidden={hasImage || undefined}
        >
          <span aria-hidden>{champion.tournamentYear}</span>
          <i aria-hidden>{initials}</i>
          <strong>{t("photoPending")}</strong>
          <small>
            <span aria-hidden>{flagForCountry(champion.nationCode)}</span>{" "}
            {champion.representativePlayer}
          </small>
        </div>
        {hasImage && champion.representativeImage ? (
          <Image
            className={styles.image}
            src={assetUrl(champion.representativeImage)}
            alt={t("imageAlt", { player: champion.representativePlayer, country: localize(champion.nationName), year: champion.tournamentYear })}
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
