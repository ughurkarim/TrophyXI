"use client";

import { useState } from "react";
import styles from "./engineering.module.css";
import { useLocalizedContent } from "@/i18n/content";

const terms = [
  {
    symbol: "q",
    label: "TOURNAMENT QUALITY",
    title: "Start with the version that actually played.",
    copy: "A card represents one player at one World Cup. That tournament version is the baseline, instead of compressing an entire career into one number.",
    impact: "Sets the baseline before team context is applied.",
  },
  {
    symbol: "p",
    label: "POSITION FIT",
    title: "Where you use the player matters.",
    copy: "A strong card can still be a bad fit for a slot. The engine applies placement cost before the match so squad construction stays meaningful.",
    impact: "Changes how much of the raw quality is actually usable.",
  },
  {
    symbol: "t",
    label: "TACTICAL BALANCE",
    title: "A lineup has structure.",
    copy: "The XI is evaluated as a unit, not just as a collection of famous names. Team shape is part of the state that reaches the simulator.",
    impact: "Changes the quality of the XI as a system.",
  },
  {
    symbol: "c",
    label: "CHEMISTRY",
    title: "Players do not act independently.",
    copy: "Compatibility belongs in the team model because eleven individually great choices can still make a worse team than eleven choices that fit together.",
    impact: "Adds interaction between individual selections.",
  },
  {
    symbol: "m",
    label: "MANAGER",
    title: "The same XI can behave differently.",
    copy: "Manager offense, defense, tactics and game management affect how a squad expresses its quality once the match starts.",
    impact: "Transforms the team state before and during simulation.",
  },
  {
    symbol: "e",
    label: "ERA",
    title: "The environment changes the problem.",
    copy: "Moving a player into another era is not a flat bonus. The translation works in both directions because 1970 into 2026 is not the same problem as 2026 into 1970.",
    impact: "Changes the environment the player and team must operate inside.",
  },
  {
    symbol: "b",
    label: "BENCH",
    title: "Depth is part of the model.",
    copy: "The bench matters because substitutions are decisions made from the current match state. It is not just extra card art under the XI.",
    impact: "Expands the decisions available later in the match.",
  },
  {
    symbol: "x",
    label: "TOURNAMENT CONTEXT",
    title: "Context can separate close cases.",
    copy: "Tournament experience and sourced achievements can matter when two cases are otherwise close, but they stay bounded so they do not overpower the football model.",
    impact: "Adds context without overpowering the football model.",
  },
] as const;

export default function ModelExplorer() {
  const localize = useLocalizedContent();
  const [active, setActive] = useState(0);
  const term = terms[active];

  return (
    <div className={styles.modelExplorer} data-glow="gold">
      <div className={styles.modelExplorerTop}>
        <div>
          <span className={styles.miniLabel}>{localize("INTERACTIVE MODEL")}</span>
          <h3>{localize("Pick a variable.")}</h3>
        </div>
        <div className={styles.modelEquationInteractive} aria-label={localize("Team model equation")}>
          <span>z</span>
          <sub>team</sub>
          <span>=</span>
          <span>[</span>
          {terms.map((item, index) => (
            <button
              key={item.symbol}
              type="button"
              className={index === active ? styles.modelSymbolActive : styles.modelSymbol}
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              aria-label={`${localize("Explain")} ${localize(item.label)}`}
            >
              {item.symbol}
            </button>
          ))}
          <span>]</span>
        </div>
      </div>

      <div className={styles.modelTermButtons}>
        {terms.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={index === active ? styles.modelTermButtonActive : styles.modelTermButton}
            onClick={() => setActive(index)}
          >
            <span>{item.symbol}</span>
            {localize(item.label)}
          </button>
        ))}
      </div>

      <div className={styles.modelExplainer} key={term.symbol}>
        <div className={styles.modelExplainerSymbol}>{term.symbol}</div>
        <div>
          <span className={styles.miniLabel}>{localize(term.label)}</span>
          <h4>{localize(term.title)}</h4>
          <p>{localize(term.copy)}</p>
        </div>
        <div className={styles.modelImpact}>
          <span>{localize("WHY IT MATTERS")}</span>
          <strong>{localize(term.impact)}</strong>
        </div>
      </div>
    </div>
  );
}
