"use client";

import { useState } from "react";
import styles from "./engineering.module.css";
import { useLocalizedContent } from "@/i18n/content";

type Direction = "forward" | "backward";

export default function EraLab() {
  const localize = useLocalizedContent();
  const [direction, setDirection] = useState<Direction>("forward");
  const from = direction === "forward" ? "1970" : "2026";
  const to = direction === "forward" ? "2026" : "1970";

  return (
    <div className={styles.eraLab} data-glow="gold">
      <div className={styles.eraControls}>
        <button
          type="button"
          className={direction === "forward" ? styles.eraControlActive : styles.eraControl}
          onClick={() => setDirection("forward")}
        >
          1970 → 2026
        </button>
        <button
          type="button"
          className={direction === "backward" ? styles.eraControlActive : styles.eraControl}
          onClick={() => setDirection("backward")}
        >
          2026 → 1970
        </button>
      </div>

      <div className={styles.eraStage} key={direction}>
        <div className={styles.eraYearCard}>
          <span>{localize("SOURCE")}</span>
          <strong>{from}</strong>
        </div>
        <div className={styles.eraTransfer}>
          <div className={styles.eraTransferLine} />
          <span>{localize("translate")}</span>
        </div>
        <div className={styles.eraYearCard}>
          <span>{localize("ENVIRONMENT")}</span>
          <strong>{to}</strong>
        </div>
      </div>

      <div className={styles.eraReadout}>
        <strong>E({from} → {to})</strong>
        <span>≠</span>
        <strong>E({to} → {from})</strong>
      </div>
      <p className={styles.eraLabCopy}>
        {localize("The direction matters. The environment changes, then the translation is evaluated in that direction. No era gets a permanent built in advantage.")}
      </p>
    </div>
  );
}
