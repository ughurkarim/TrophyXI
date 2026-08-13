import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import worldCupBackground from "../../../assets/worldcup.png";
import styles from "./final-challenge-showcase.module.css";
import { useTranslations } from "next-intl";

export function FinalChallengeShowcase() {
  const t = useTranslations("landing.finalChallenge");
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
          <p className={styles.eyebrow}>{t("eyebrow")}</p>

          <h2 id="landing-final-cta-title">
            {t("line1")}
            <br />
            {t("line2")}
            <br />
            <span>{t("line3")}</span>
          </h2>

          <p className={styles.support}>
            {t("description")}
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/play">
              <span>{t("build")}</span>
              <ArrowRight size={17} aria-hidden />
            </Link>

            <Link className={styles.secondaryAction} href="/#champions">
              {t("viewChampions")}
              <ChevronRight size={15} aria-hidden />
            </Link>
          </div>

          <div className={styles.challengeMeta} aria-label={t("aria")}>
            <span>{t("championsCount", { count: 15 })}</span>
            <i />
            <span>1970 — 2026</span>
            <i />
            <span>{t("oneXi")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
