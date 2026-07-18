"use client";

import Image from "next/image";
import { imagesById } from "@/data/player-images";
import type { PlayerStatusTier } from "@/types/game";

export type PortraitSize = "compact" | "standard" | "featured" | "hero";

export function CircularPortrait({
  imageId,
  subjectName,
  era,
  statusTier,
  size = "standard",
}: {
  imageId: string;
  subjectName: string;
  era: string;
  statusTier?: PlayerStatusTier;
  size?: PortraitSize;
}) {
  const image = imagesById.get(imageId);
  if (!image) return null;
  const context = {
    "exact-tournament": "Exact-tournament photograph",
    "same-year-national-team": "Same-year national-team photograph",
    "nearby-year-national-team": "Nearby-year national-team photograph",
    "other-licensed-face": "Other licensed face photograph",
    "original-project-mark": "Original Trophy XI project mark",
  }[image.photoContext];
  return (
    <span
      className={`circular-portrait circular-portrait--${size}${
        statusTier ? ` circular-portrait--${statusTier}` : ""
      }`}
      data-era={era}
      data-image-context={context}
    >
      <span className="circular-portrait__mask">
        <Image
          src={image.file}
          alt={`${context} of ${subjectName}`}
          fill
          unoptimized
          sizes="(max-width: 700px) 96px, 128px"
          style={{
            objectPosition: `${image.cropFocus.x}% ${image.cropFocus.y}%`,
          }}
        />
      </span>
      <span className="circular-portrait__rim" aria-hidden />
    </span>
  );
}
