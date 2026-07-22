"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { LandingChampion } from "@/data/landing-champions";
import { assetUrl } from "@/lib/assets";
import { flagForCountry } from "@/lib/utils";
import { ChampionShowcaseCard } from "./champion-showcase-card";
import styles from "./champion-history-showcase.module.css";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const championIndexForProgress = (progress: number, count: number) =>
  Math.min(
    count - 1,
    Math.floor(clamp(progress, 0, 0.999_999) * count),
  );

export const championProgressForIndex = (index: number, count: number) =>
  `${((clamp(index, 0, count - 1) + 1) / count) * 100}%`;

const countryAccent: Record<string, string> = {
  ARG: "112 181 233",
  BRA: "244 213 67",
  ESP: "208 45 58",
  FRA: "75 123 194",
  GER: "222 183 70",
  ITA: "74 145 197",
  TBD: "214 180 92",
};

const initialsFor = (name: string) =>
  name === "Representative to be confirmed"
    ? "TBC"
    : name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

function PendingPortrait({ champion }: { champion: LandingChampion }) {
  return (
    <div
      className={styles.pendingPortrait}
      role="img"
      aria-label={`${champion.representativePlayer}, ${champion.tournamentYear} photo pending`}
    >
      <span className={styles.pendingYear} aria-hidden>
        {champion.tournamentYear}
      </span>
      <span className={styles.pendingInitials} aria-hidden>
        {initialsFor(champion.representativePlayer)}
      </span>
      <strong>PHOTO PENDING</strong>
      <small>
        <span aria-hidden>{flagForCountry(champion.nationCode)}</span>{" "}
        {champion.representativePlayer}
      </small>
    </div>
  );
}

export function ChampionHistoryShowcase({
  champions,
}: {
  champions: LandingChampion[];
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const nextIndex = championIndexForProgress(progress, champions.length);
    setActiveIndex((current) =>
      current === nextIndex ? current : nextIndex,
    );
  });

  useEffect(() => {
    for (const nearbyIndex of [activeIndex - 1, activeIndex + 1]) {
      const imagePath = champions[nearbyIndex]?.representativeImage;
      if (imagePath) {
        const preload = new window.Image();
        preload.src = assetUrl(imagePath);
      }
    }
  }, [activeIndex, champions]);

  const champion = champions[activeIndex];
  const hasImage =
    Boolean(champion.representativeImage) && !failedImages.has(champion.id);
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
  const sceneStyle = {
    "--champion-count": champions.length,
    "--country-accent": countryAccent[champion.nationCode] ?? "214 180 92",
    "--champion-progress": championProgressForIndex(
      activeIndex,
      champions.length,
    ),
  } as CSSProperties;

  const selectChampion = (index: number) => {
    setActiveIndex(index);
    const scene = sceneRef.current;
    if (!scene) return;

    const scrollDistance = Math.max(0, scene.offsetHeight - window.innerHeight);
    const progress = champions.length > 1 ? index / (champions.length - 1) : 0;
    window.scrollTo({
      top: scene.offsetTop + scrollDistance * progress,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <>
      <div
        ref={sceneRef}
        className={styles.desktopScene}
        style={sceneStyle}
        data-testid="champion-scroll-scene"
        data-active-year={champion.tournamentYear}
      >
        <div className={styles.stickyFrame}>
          <div className={styles.stage}>
            <span className={styles.edgeLight} aria-hidden />
            <span className={styles.countryAura} aria-hidden />

            <div className={styles.copySlot}>
              <AnimatePresence initial={false}>
                <motion.article
                  key={champion.id}
                  className={styles.copy}
                  aria-label={
                    champion.status === "pending"
                      ? `${champion.tournamentYear} world champion pending confirmation`
                      : `${champion.nationName} ${champion.tournamentYear} world champion showcase`
                  }
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: 22, filter: "blur(5px)" }
                  }
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -18, filter: "blur(5px)" }
                  }
                  transition={transition}
                >
                  <p className={styles.worldChampionLabel}>
                    WORLD CHAMPION
                    {champion.status === "pending" ? " · PENDING" : ""}
                  </p>
                  <p className={styles.countryCode}>
                    <span aria-hidden>{flagForCountry(champion.nationCode)}</span>
                    {champion.nationCode}
                  </p>
                  <p className={styles.year}>{champion.tournamentYear}</p>
                  <h3>{champion.nationName}</h3>
                  <div className={styles.playerName}>
                    <span>REPRESENTATIVE PLAYER</span>
                    <strong>{champion.representativePlayer}</strong>
                  </div>
                  <p className={styles.fact}>{champion.championFact}</p>
                  <p className={styles.tacticalLabel}>
                    {champion.tacticalLabel}
                  </p>
                </motion.article>
              </AnimatePresence>
            </div>

            <div className={styles.visualSlot} aria-live="polite">
              <span className={styles.backgroundYear} aria-hidden>
                {champion.tournamentYear}
              </span>
              <AnimatePresence initial={false}>
                <motion.div
                  key={`${champion.id}-${hasImage ? "image" : "pending"}`}
                  className={styles.playerVisual}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: 30, scale: 0.985 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -22, scale: 1.01 }
                  }
                  transition={transition}
                >
                  {hasImage && champion.representativeImage ? (
                    <Image
                      className={styles.playerImage}
                      src={assetUrl(champion.representativeImage)}
                      alt={`${champion.representativePlayer} celebrates ${champion.nationName}’s ${champion.tournamentYear} World Cup victory`}
                      fill
                      unoptimized
                      priority={activeIndex === 0}
                      sizes="(max-width: 900px) 1px, 54vw"
                      style={{ objectPosition: champion.imagePosition }}
                      onError={() =>
                        setFailedImages((current) => {
                          const next = new Set(current);
                          next.add(champion.id);
                          return next;
                        })
                      }
                    />
                  ) : (
                    <PendingPortrait champion={champion} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <nav className={styles.timeline} aria-label="Champion years">
              {champions.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.yearButton}
                  aria-label={`Show ${entry.tournamentYear} ${entry.nationName}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => selectChampion(index)}
                >
                  <span>{entry.tournamentYear}</span>
                </button>
              ))}
            </nav>

            <div className={styles.scrollCue} aria-hidden>
              <span>{String(activeIndex + 1).padStart(2, "0")}</span>
              <i />
              <span>{String(champions.length).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mobileGallery} data-testid="champion-mobile-gallery">
        {champions.map((entry, index) => (
          <ChampionShowcaseCard
            key={entry.id}
            champion={entry}
            index={index}
            total={champions.length}
          />
        ))}
      </div>
    </>
  );
}
