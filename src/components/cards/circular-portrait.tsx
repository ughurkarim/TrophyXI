"use client";

import Image from "next/image";
import { imagesById } from "@/data/player-images";

export type PortraitSize = "compact" | "standard" | "featured" | "hero";

export function CircularPortrait({
  imageId,
  subjectName,
  era,
  size = "standard",
}: {
  imageId: string;
  subjectName: string;
  era: string;
  size?: PortraitSize;
}) {
  const image = imagesById.get(imageId);
  if (!image) return null;
  const context = image.fallback
    ? "Illustrated fallback"
    : image.exactTournamentImage
      ? "Exact-tournament photograph"
      : image.isNationalTeamKit
        ? "Licensed national-team photograph"
        : "Licensed international photograph";
  return (
    <span
      className={`circular-portrait circular-portrait--${size}`}
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
