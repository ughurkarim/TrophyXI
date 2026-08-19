"use client";

import { useState } from "react";
import styles from "./engineering.module.css";

type Direction = "forward" | "backward";

export default function EraLab() {
  const [direction, setDirection] = useState<Direction>("forward");
  const from = direction === "forward" ? "1970" : "2026";
  const to = direction === "forward" ? "2026" : "1970";

  return (
    <div className={styles.eraLab}>
      <div className={styles.eraControls}>
        <button
          type="button"
          className={direction === "forward" ? styles.eraControlActive : styles.eraControl}
          onClick={() => setDirection("forward")}
          aria-pressed={direction === "forward"}
        >
          1970 → 2026
        </button>
        <button
          type="button"
          className={direction === "backward" ? styles.eraControlActive : styles.eraControl}
          onClick={() => setDirection("backward")}
          aria-pressed={direction === "backward"}
        >
          2026 → 1970
        </button>
      </div>

      <div className={styles.eraStage} key={direction}>
        <div className={styles.eraYearNode}>
          <strong>{from}</strong>
          <span>SOURCE</span>
        </div>

        <div className={styles.eraDirection} aria-hidden="true">
          <span>→</span>
        </div>

        <div className={styles.eraYearNode}>
          <strong>{to}</strong>
          <span>ENVIRONMENT</span>
        </div>
      </div>

      <div className={styles.eraReadout}>
        <strong>E({from} → {to})</strong>
        <span>≠</span>
        <strong>E({to} → {from})</strong>
      </div>
    </div>
  );
}