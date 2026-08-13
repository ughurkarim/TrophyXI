import type { Metadata } from "next";
import Link from "next/link";
import EraLab from "./EraLab";
import MatchStateLab from "./MatchStateLab";
import ModelExplorer from "./ModelExplorer";
import SeedTrace from "./SeedTrace";
import styles from "./engineering.module.css";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("engineering");
  return { title: t("metadataTitle"), description: t("metadataDescription") };
}

export default async function EngineeringPage() {
  const t = await getTranslations("engineering");
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.dashboardLink} aria-label={t("backAria")}>
        <span aria-hidden="true">←</span> {t("dashboard")}
      </Link>
      <section className={`${styles.section} ${styles.hero}`}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>{t("hero.eyebrow")}</p>
            <h1 className={styles.heroTitle}>
              {t("hero.titleFirst")}
              <br />
              {t("hero.titleSecond")}
            </h1>
          </div>
          <div className={styles.heroCopy}>
            <p>{t("hero.description")}</p>
            <p>{t("hero.seedDescription")}</p>
          </div>
        </div>

        <div className={styles.statRail}>
          <span><strong>1,832</strong> {t("stats.cards")}</span>
          <span><strong>924</strong> {t("stats.identities")}</span>
          <span><strong>15</strong> {t("stats.champions")}</span>
          <span><strong>1</strong> {t("stats.engine")}</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.modelSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t("teamModel.eyebrow")}</p>
          <h2>{t("teamModel.title")}</h2>
          <p>{t("teamModel.description")}</p>
        </div>
        <ModelExplorer />
      </section>

      <section className={`${styles.section} ${styles.darkBand}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{t("position.eyebrow")}</p>
            <h2>{t("position.title")}</h2>
            <p>{t("position.description")}</p>
          </div>

          <div className={styles.mathStack}>
            <div className={styles.mathLine}>
              <span className={styles.mathName}>{t("position.rawXi")}</span>
              <strong>Q<sub>raw</sub></strong>
            </div>
            <div className={styles.mathOperator}>−</div>
            <div className={styles.mathLine}>
              <span className={styles.mathName}>{t("position.cost")}</span>
              <strong>Σ cost(p<sub>i</sub>)</strong>
            </div>
            <div className={styles.mathOperator}>=</div>
            <div className={`${styles.mathLine} ${styles.mathResult}`}>
              <span className={styles.mathName}>{t("position.usable")}</span>
              <strong>Q<sub>use</sub></strong>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.eraSection}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{t("era.eyebrow")}</p>
            <h2>{t("era.title")}</h2>
            <p>{t("era.description")}</p>
          </div>
          <EraLab />
        </div>
      </section>

      <section className={`${styles.section} ${styles.managerSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t("manager.eyebrow")}</p>
          <h2>{t("manager.title")}</h2>
          <p>{t("manager.description")}</p>
        </div>

        <div className={styles.managerFormula}>
          <span>{t("manager.teamState")}</span>
          <strong>z</strong>
          <span className={styles.transformArrow}>→</span>
          <div className={styles.managerBox}>
            <span>{t("manager.transform")}</span>
            <b>{t("manager.factors")}</b>
          </div>
          <span className={styles.transformArrow}>→</span>
          <strong>z′</strong>
        </div>
      </section>

      <section className={`${styles.section} ${styles.matchSection}`}>
        <div className={styles.matchHeading}>
          <p className={styles.eyebrow}>{t("matchEngine.eyebrow")}</p>
          <h2>{t("matchEngine.title")}</h2>
          <p>{t("matchEngine.description")}</p>
        </div>

        <div className={styles.functionCard}>
          <div className={styles.functionRow}>
            <span>{t("matchEngine.result")}</span>
            <strong>=</strong>
            <strong>F(team A, team B, managers, era, state, σ)</strong>
          </div>
          <div className={styles.functionLegend}>
            <span>{t("matchEngine.seed")}</span>
            <span>{t("matchEngine.order")}</span>
          </div>
        </div>

        <div className={styles.enginePipeline}>
          {(["players", "fit", "team", "context", "state", "seed"] as const).map((key, itemIndex) => (
            <div key={key} className={styles.engineStep}>
              <span>{String(itemIndex + 1).padStart(2, "0")}</span>
              <strong>{t(`matchEngine.pipeline.${key}.title`)}</strong>
              <small>{t(`matchEngine.pipeline.${key}.description`)}</small>
            </div>
          ))}
        </div>

        <div className={styles.seedEquation}>
          <span>u₁, u₂, …, uₙ</span>
          <span>=</span>
          <strong>PRNG(σ)</strong>
        </div>

        <SeedTrace />
      </section>

      <section className={`${styles.section} ${styles.stateSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t("matchState.eyebrow")}</p>
          <h2>{t("matchState.title")}</h2>
          <p>{t("matchState.description")}</p>
        </div>
        <MatchStateLab />
        <p className={styles.pullQuote}>
          {t("matchState.quote")}
        </p>
      </section>

      <section className={`${styles.section} ${styles.benchSection}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{t("bench.eyebrow")}</p>
            <h2>{t("bench.title")}</h2>
            <p>{t("bench.description")}</p>
          </div>

          <div className={styles.subFunction}>
            <span>{t("bench.decision")}</span>
            <strong>B(s<sub>t</sub>, manager, bench, fit, fatigue, σ)</strong>
            <div className={styles.subTags}>
              <i>{t("bench.tags.chase")}</i><i>{t("bench.tags.protect")}</i><i>{t("bench.tags.fresh")}</i><i>{t("bench.tags.fit")}</i><i>{t("bench.tags.extraTime")}</i>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.integritySection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t("testing.eyebrow")}</p>
          <h2>{t("testing.title")}</h2>
          <p>{t("testing.description")}</p>
        </div>

        <div className={styles.integrityGrid}>
          {(["simulation", "data", "product"] as const).map((key) => <article key={key}><span>{t(`testing.cards.${key}.label`)}</span><strong>{t(`testing.cards.${key}.title`)}</strong><p>{t(`testing.cards.${key}.description`)}</p></article>)}
        </div>
      </section>

      <section className={`${styles.section} ${styles.infrastructureSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t("delivery.eyebrow")}</p>
          <h2>{t("delivery.title")}</h2>
          <p>{t("delivery.description")}</p>
        </div>

        <div className={styles.architecture}>
          <div><span>{t("delivery.product")}</span><strong>NEXT.JS + TYPESCRIPT</strong></div>
          <span>→</span>
          <div><span>{t("delivery.engine")}</span><strong>{t("delivery.stateSimulation")}</strong></div>
          <span>→</span>
          <div><span>{t("delivery.assets")}</span><strong>S3 + CLOUDFRONT</strong></div>
          <span>→</span>
          <div><span>{t("delivery.delivery")}</span><strong>VERCEL + CLOUDFLARE</strong></div>
        </div>

        <div className={styles.performanceRail}>
          <span><strong>200 / 200</strong> {t("delivery.testRequests")}</span>
          <span><strong>86 ms</strong> {t("delivery.medianResponse")}</span>
          <span><strong>95%</strong> {t("delivery.under374")}</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.thesisSection}`}>
        <p className={styles.eyebrow}>{t("idea.eyebrow")}</p>
        <div className={styles.thesisLead}>
          <h2>{t("idea.title")}</h2>
          <p>{t("idea.description")}</p>
        </div>

        <div className={styles.ideaGrid}>
          <article>
            <span>01</span>
            <strong>{t("idea.cards.decisions.title")}</strong>
            <p>{t("idea.cards.decisions.description")}</p>
          </article>
          <article>
            <span>02</span>
            <strong>{t("idea.cards.upsets.title")}</strong>
            <p>{t("idea.cards.upsets.description")}</p>
          </article>
          <article>
            <span>03</span>
            <strong>{t("idea.cards.results.title")}</strong>
            <p>{t("idea.cards.results.description")}</p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.finalCta}`}>
        <p className={styles.eyebrow}>{t("final.eyebrow")}</p>
        <h2>{t("final.title")}</h2>
        <p>{t("final.description")}</p>
        <Link href="/play" className={styles.ctaButton}>{t("final.cta")}</Link>
        <div className={styles.finalRail}>{t("final.rail")}</div>
      </section>
    </main>
  );
}
