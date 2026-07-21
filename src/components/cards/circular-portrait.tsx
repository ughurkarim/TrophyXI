"use client";

import Image from "next/image";
import { imagesById } from "@/data/player-images";
import { assetUrl } from "@/lib/assets";
import { flagForCountry } from "@/lib/utils";
import type { PlayerStatusTier } from "@/types/game";

export type PortraitSize = "compact" | "standard" | "featured" | "hero";

export function CircularPortrait({
  imageId,
  subjectName,
  era,
  statusTier,
  countryCode,
  tournamentYear,
  size = "standard",
}: {
  imageId: string;
  subjectName: string;
  era: string;
  statusTier?: PlayerStatusTier;
  countryCode?: string;
  tournamentYear?: number;
  size?: PortraitSize;
}) {
  const image = imagesById.get(imageId);
  const initials = subjectName
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !/^(?:de|da|do|dos|van|von)$/i.test(part))
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();
  return (
    <span
      className={`circular-portrait circular-portrait--${size}${
        statusTier ? ` circular-portrait--${statusTier}` : ""
      }${image ? "" : " circular-portrait--pending"}`}
      data-era={era}
    >
      <span className="circular-portrait__mask">
        {image ? (
          <Image
            src={`${assetUrl(image.file)}?v=${encodeURIComponent(
              image.cacheVersion,
            )}`}
            alt={`${subjectName}${tournamentYear ? ` ${tournamentYear}` : ""} portrait`}
            fill
            unoptimized
            sizes="(max-width: 700px) 96px, 128px"
            style={{ objectPosition: "center top" }}
          />
        ) : (
          <span
            className="circular-portrait__pending"
            role="img"
            aria-label={`${subjectName}${
              tournamentYear ? ` ${tournamentYear}` : ""
            } portrait`}
          >
            <b>{initials || "XI"}</b>
            <i>
              {countryCode ? flagForCountry(countryCode) : "✦"}{" "}
              {tournamentYear ?? ""}
            </i>
          </span>
        )}
      </span>
      <span className="circular-portrait__rim" aria-hidden />
    </span>
  );
}
