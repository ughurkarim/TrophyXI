"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import {
  imagesById,
  isPlayablePlayerCardId,
  playerGameFaceCacheVersionForPath,
  playablePlayerGameFaceCandidatesFor,
} from "@/data/player-images";
import { assetUrl } from "@/lib/assets";
import { flagForCountry } from "@/lib/utils";
import type { PlayerStatusTier } from "@/types/game";

export type PortraitSize = "compact" | "standard" | "featured" | "hero";

type FailedSourcesState = {
  imageId: string;
  sources: string[];
};

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
  const registeredImage = imagesById.get(imageId);
  const isPlayer = isPlayablePlayerCardId(imageId);

  const imageSources = useMemo(() => {
    if (isPlayer) {
      return playablePlayerGameFaceCandidatesFor(imageId).map((path) => {
        const source = assetUrl(path);
        const cacheVersion = playerGameFaceCacheVersionForPath(path);

        return cacheVersion
          ? `${source}?v=${encodeURIComponent(cacheVersion)}`
          : source;
      });
    }

    if (!registeredImage) return [];

    return [
      `${assetUrl(registeredImage.file)}?v=${encodeURIComponent(
        registeredImage.cacheVersion,
      )}`,
    ];
  }, [imageId, isPlayer, registeredImage]);

  const [failedState, setFailedState] = useState<FailedSourcesState>({
    imageId,
    sources: [],
  });

  const failedSources =
    failedState.imageId === imageId ? failedState.sources : [];

  const visibleImageSource =
    imageSources.find((source) => !failedSources.includes(source)) ?? null;

  const initials = subjectName
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !/^(?:de|da|do|dos|van|von)$/i.test(part))
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();

  const markSourceFailed = (source: string) => {
    setFailedState((current) => {
      const currentSources =
        current.imageId === imageId ? current.sources : [];

      if (currentSources.includes(source)) {
        return { imageId, sources: currentSources };
      }

      return {
        imageId,
        sources: [...currentSources, source],
      };
    });
  };

  return (
    <span
      className={`circular-portrait circular-portrait--${size}${
        statusTier ? ` circular-portrait--${statusTier}` : ""
      }${visibleImageSource ? "" : " circular-portrait--pending"}`}
      data-era={era}
    >
      <span className="circular-portrait__mask">
        {visibleImageSource ? (
          <Image
            key={visibleImageSource}
            src={visibleImageSource}
            alt={`${subjectName}${
              tournamentYear ? ` ${tournamentYear}` : ""
            } portrait`}
            fill
            unoptimized
            sizes="(max-width: 700px) 96px, 128px"
            style={{ objectPosition: "center top" }}
            onError={() => markSourceFailed(visibleImageSource)}
          />
        ) : (
          <span
            className="circular-portrait__pending"
            role="img"
            aria-label={`${subjectName}${
              tournamentYear ? ` ${tournamentYear}` : ""
            } portrait, photo pending`}
          >
            <UserRound aria-hidden />
            <b>{initials || "XI"}</b>
            <small>PHOTO PENDING</small>
            <i>
              {countryCode ? flagForCountry(countryCode) : "✦"}{" "}
              {tournamentYear ?? ""}
            </i>
          </span>
        )}
      </span>
    </span>
  );
}
