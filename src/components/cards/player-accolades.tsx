"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  getPlayerAccoladeItems,
  type AccoladeKind,
} from "@/engine/accolade-effects";
import { cn } from "@/lib/utils";
import type { PlayerTournamentCard } from "@/types/game";
import styles from "./player-accolades.module.css";

export const accoladeTransition = (
  reduceMotion: boolean | null,
  index: number,
) => ({
  duration: reduceMotion ? 0 : 0.2,
  delay: reduceMotion ? 0 : index * 0.07,
});

const iconByKind: Record<AccoladeKind, string> = {
  "world-cup-champion": "🏆",
  "ballon-dor": "◆",
  "world-cup-golden-ball": "◉",
  "world-cup-golden-boot": "★",
  "world-cup-golden-glove": "✦",
  "continental-international": "◈",
  "continental-club": "★",
  "international-individual": "✦",
  "domestic-league": "⬡",
  "domestic-cup": "▲",
  "league-individual": "✧",
  "other-individual": "◇",
  "top-100": "◇",
};

export function PlayerAccolades({
  player,
  compact = false,
  onOpenRecord,
}: {
  player: PlayerTournamentCard;
  compact?: boolean;
  onOpenRecord?: () => void;
}) {
  const t = useTranslations("players.accolades");
  const reduceMotion = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const items = getPlayerAccoladeItems(player);
  if (items.length === 0) return null;

  if (compact) {
    const visible = items.slice(0, 3);
    const content = (
      <>
        {visible.map((item) => (
          <span
            className={styles.chip}
            data-accolade-kind={item.kind}
            key={item.id}
          >
            <i aria-hidden>{iconByKind[item.kind]}</i>
            <b>
              {item.count === undefined ? "" : `${item.count}× `}
              {item.label}
            </b>
          </span>
        ))}
        {items.length > visible.length && (
          <span className={styles.moreChip}>
            {t("moreCompact", { count: items.length - visible.length })}
          </span>
        )}
      </>
    );
    return onOpenRecord ? (
      <button
        type="button"
        className={styles.compact}
        onClick={onOpenRecord}
        aria-label={t("viewFullAria", { player: player.playerName })}
      >
        {content}
      </button>
    ) : (
      <div className={styles.compact}>{content}</div>
    );
  }

  const visible = showAll ? items : items.slice(0, 6);
  return (
    <section
      className={styles.section}
      aria-labelledby={`career-accolades-${player.id}`}
    >
      <span className="eyebrow" id={`career-accolades-${player.id}`}>
        {t("title")}
      </span>
      <ul className={cn("achievement-list", styles.list)}>
        {visible.map((item, index) => (
          <motion.li
            key={item.id}
            className={styles.row}
            data-accolade-kind={item.kind}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={accoladeTransition(reduceMotion, index)}
          >
            <span className={styles.icon} aria-hidden>
              {iconByKind[item.kind]}
            </span>
            <b>
              {item.count === undefined ? "" : `${item.count}× `}
              {item.label}
            </b>
            <small>{item.effectLabel}</small>
          </motion.li>
        ))}
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          className={styles.showMore}
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? t("showLess") : t("showMore", { count: items.length - 6 })}
        </button>
      )}
    </section>
  );
}
