"use client";

import { useEffect, useState } from "react";
import styles from "./engineering.module.css";

const sections = [
  ["team-model", "MODEL"],
  ["position", "POSITION"],
  ["era", "ERA"],
  ["manager", "MANAGER"],
  ["match-engine", "ENGINE"],
  ["match-state", "STATE"],
  ["bench", "BENCH"],
  ["testing", "TESTING"],
  ["delivery", "DELIVERY"],
  ["idea", "IDEA"],
] as const;

type SectionId = (typeof sections)[number][0];

export default function SectionNav() {
  const [active, setActive] = useState<SectionId>("team-model");

  useEffect(() => {
    let ticking = false;

    const updateActive = () => {
      const marker = Math.min(window.innerHeight * 0.34, 260);
      let current: SectionId = sections[0][0];

      for (const [id] of sections) {
        const element = document.getElementById(id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= marker) current = id;
      }

      setActive(current);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className={styles.sectionNavShell}>
      <nav className={styles.sectionNav} aria-label="Engineering sections">
        {sections.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className={active === id ? styles.sectionNavActive : undefined}
            aria-current={active === id ? "location" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}