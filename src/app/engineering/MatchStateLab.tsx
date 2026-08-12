"use client";

import { useState } from "react";
import styles from "./engineering.module.css";

const scenarios = [
  {
    label: "EARLY",
    score: "0–0",
    minute: "20'",
    caption: "The match is still open. Score and time create a very different state from the final twenty minutes.",
    active: ["SCORE", "MINUTE", "POSSESSION", "SHOTS"],
  },
  {
    label: "PROTECT",
    score: "1–0",
    minute: "72'",
    caption: "Now the lead, the clock, fatigue and the bench all become more important to the next decision.",
    active: ["SCORE", "MINUTE", "FATIGUE", "SUBSTITUTIONS"],
  },
  {
    label: "CHASE",
    score: "0–1",
    minute: "82'",
    caption: "The same team now has a different problem. The score and remaining time change what the engine should care about next.",
    active: ["SCORE", "MINUTE", "SHOTS", "SUBSTITUTIONS"],
  },
  {
    label: "EXTRA TIME",
    score: "1–1",
    minute: "105'",
    caption: "Extra time increases the weight of fatigue, cards and remaining substitution options inside the current state.",
    active: ["MINUTE", "CARDS", "FATIGUE", "SUBSTITUTIONS"],
  },
] as const;

const terms = ["SCORE", "MINUTE", "POSSESSION", "SHOTS", "xG", "CARDS", "FATIGUE", "SUBSTITUTIONS"];

export default function MatchStateLab() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scenario = scenarios[activeIndex];

  return (
    <div className={styles.stateLab} data-glow="green">
      <div className={styles.stateScenarioTabs}>
        {scenarios.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={index === activeIndex ? styles.stateScenarioActive : styles.stateScenario}
            onClick={() => setActiveIndex(index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.stateScoreboard} key={scenario.label}>
        <div>
          <span>SCORE</span>
          <strong>{scenario.score}</strong>
        </div>
        <div>
          <span>MINUTE</span>
          <strong>{scenario.minute}</strong>
        </div>
        <p>{scenario.caption}</p>
      </div>

      <div className={styles.stateVariableGrid}>
        {terms.map((term) => {
          const isActive = scenario.active.some((activeTerm) => activeTerm === term);
          return (
            <div className={isActive ? styles.stateVariableActive : styles.stateVariable} key={term}>
              <span>{term}</span>
              <i>{isActive ? "IN FOCUS" : "IN STATE"}</i>
            </div>
          );
        })}
      </div>

      <div className={styles.stateMachine}>
        <div><span>CURRENT STATE</span><strong>s<sub>t</sub></strong></div>
        <span>→</span>
        <div className={styles.stateMachineCore}><span>ENGINE</span><strong>G(·)</strong></div>
        <span>→</span>
        <div><span>NEXT EVENT</span><strong>e<sub>t+1</sub></strong></div>
        <span>→</span>
        <div><span>NEW STATE</span><strong>s<sub>t+1</sub></strong></div>
      </div>
    </div>
  );
}
