"use client";

import { useMemo, useState } from "react";
import styles from "./engineering.module.css";

function hashSeed(input: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sequenceFor(seedText: string) {
  const random = mulberry32(hashSeed(seedText));
  return Array.from({ length: 6 }, () => random());
}

export default function SeedTrace() {
  const [seed, setSeed] = useState("184730291");
  const [reruns, setReruns] = useState(0);

  const values = useMemo(() => sequenceFor(seed), [seed]);

  const changeSeed = () => {
    setSeed((current) => String((Number(current) || 184730291) + 1));
    setReruns(0);
  };

  return (
    <div className={styles.seedDemo}>
      <div className={styles.seedDemoTop}>
        <div>
          <span className={styles.miniLabel}>TRY THE SEED</span>
          <h3>Same seed. Same sequence.</h3>
        </div>
        <div className={styles.seedInputWrap}>
          <label htmlFor="engineering-seed">SEED</label>
          <input
            id="engineering-seed"
            value={seed}
            inputMode="numeric"
            onChange={(event) => {
              setSeed(event.target.value);
              setReruns(0);
            }}
            aria-label="Seed value"
          />
        </div>
      </div>

      <div
        key={`${seed}-${reruns}`}
        className={`${styles.seedSequence} ${styles.seedSequenceAnimate}`}
        aria-label="Deterministic sample sequence"
      >
        {values.map((value, index) => (
          <div className={styles.seedValue} key={`${seed}-${index}`}>
            <div className={styles.seedBarTrack}>
              <div className={styles.seedBar} style={{ height: `${16 + value * 68}%` }} />
            </div>
            <span>u{index + 1}</span>
            <strong>{value.toFixed(6)}</strong>
          </div>
        ))}
      </div>

      <div className={styles.seedActions}>
        <button type="button" onClick={() => setReruns((value) => value + 1)}>
          RUN SAME SEED
        </button>
        <button type="button" className={styles.secondaryButton} onClick={changeSeed}>
          CHANGE SEED
        </button>
      </div>
    </div>
  );
}