import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import worldCupBackground from "../../../assets/worldcup.png";
import styles from "./final-challenge-showcase.module.css";

export function FinalChallengeShowcase() {
  return (
    <section className={styles.section} aria-labelledby="landing-final-cta-title">
      <div className={styles.backdrop} aria-hidden />

      <div className={`container ${styles.panel}`}>
        <Image
          src={worldCupBackground}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 1664px"
          className={styles.sectionBackground}
          quality={100}
          priority={false}
        />
        <div className={styles.imageBlend} aria-hidden />

        <div className={styles.copy}>
          <p className={styles.eyebrow}>THE CHALLENGE AWAITS</p>

          <h2 id="landing-final-cta-title">
            BUILD THE TEAM
            <br />
            THAT COULD
            <br />
            <span>BEAT THEM ALL.</span>
          </h2>

          <p className={styles.support}>
            Draft fourteen tournament players, shape them into one balanced squad,
            and take on the champions who defined World Cup history.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/play">
              <span>BUILD MY XI</span>
              <ArrowRight size={17} aria-hidden />
            </Link>

            <Link className={styles.secondaryAction} href="/#champions">
              VIEW THE CHAMPIONS
              <ChevronRight size={15} aria-hidden />
            </Link>
          </div>

          <div className={styles.challengeMeta} aria-label="World Cup challenge">
            <span>15 CHAMPIONS</span>
            <i />
            <span>1970 — 2026</span>
            <i />
            <span>ONE XI</span>
          </div>
        </div>
      </div>
    </section>
  );
}