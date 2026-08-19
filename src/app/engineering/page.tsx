import type { Metadata } from "next";
import Link from "next/link";
import EraLab from "./EraLab";
import MatchStateLab from "./MatchStateLab";
import ModelExplorer from "./ModelExplorer";
import SectionNav from "./SectionNav";
import SeedTrace from "./SeedTrace";
import styles from "./engineering.module.css";

export const metadata: Metadata = {
  title: "Football Match Simulator Engineering",
  description:
    "Explore the math and computer science behind Trophy XI: player quality, position fit, chemistry, era translation, managers, match state, and seeded simulation.",
  alternates: {
    canonical: "/engineering",
  },
};

export default function EngineeringPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.dashboardLink} aria-label="Back to dashboard">
        <span aria-hidden="true">←</span> DASHBOARD
      </Link>

      <SectionNav />

      <section className={`${styles.section} ${styles.hero}`}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>UNDER THE HOOD</p>
            <h1 className={styles.heroTitle}>
              THE MATH BEHIND
              <br />
              THE MATCH.
            </h1>
          </div>
          <div className={styles.heroCopy}>
            <span className={styles.heroCopyLabel}>THE MODEL</span>
            <p className={styles.heroLead}>
              Eleven great cards are only the starting point.
            </p>
          </div>
        </div>

        <div className={styles.statRail}>
          <span><strong>1,832</strong> TOURNAMENT CARDS</span>
          <span><strong>924</strong> PLAYER IDENTITIES</span>
          <span><strong>15</strong> WORLD CUP CHAMPIONS</span>
          <span><strong>1</strong> SEEDED ENGINE</span>
        </div>
      </section>

      <section id="team-model" className={`${styles.section} ${styles.modelSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>TEAM MODEL</p>
          <h2>A TEAM IS A SYSTEM, NOT A SUM.</h2>
          <p>Quality is only the baseline. The engine evaluates how the XI works together.</p>
        </div>
        <ModelExplorer />
      </section>

      <section id="position" className={`${styles.section} ${styles.darkBand}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>POSITION</p>
            <h2>A GREAT PLAYER IN THE WRONG ROLE SHOULD COST YOU.</h2>
            <p className={styles.positionCopy}>
              A player’s quality depends on where you use them. Out of position, less of that quality is usable.
            </p>
          </div>

          <div className={styles.mathStack}>
            <div className={styles.mathLine}>
              <span className={styles.mathName}>RAW XI</span>
              <strong>Q<sub>raw</sub></strong>
            </div>
            <div className={styles.mathOperator}>−</div>
            <div className={styles.mathLine}>
              <span className={styles.mathName}>POSITION COST</span>
              <strong>Σ cost(p<sub>i</sub>)</strong>
            </div>
            <div className={styles.mathOperator}>=</div>
            <div className={`${styles.mathLine} ${styles.mathResult}`}>
              <span className={styles.mathName}>USABLE QUALITY</span>
              <strong>Q<sub>use</sub></strong>
            </div>
          </div>
        </div>
      </section>

      <section id="era" className={`${styles.section} ${styles.eraSection}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>ERA TRANSLATION</p>
            <h2>1970 → 2026 IS NOT THE SAME AS 2026 → 1970.</h2>
            <p className={styles.eraCopy}>
              Era changes the environment around a player. Translating forward and backward are different problems.
            </p>
          </div>
          <EraLab />
        </div>
      </section>

      <section id="manager" className={`${styles.section} ${styles.managerSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>MANAGER</p>
          <h2>CHANGE THE MANAGER. CHANGE THE TEAM.</h2>
          <p>
            The same XI can play differently under a different manager. Tactics, balance and game management reshape how the team behaves.
          </p>
        </div>

        <div className={styles.managerFormula}>
          <span>TEAM STATE</span>
          <strong>z</strong>
          <span className={styles.transformArrow}>→</span>
          <div className={styles.managerBox}>
            <span>MANAGER TRANSFORM</span>
            <b>OFF · DEF · TACTICS · GAME MANAGEMENT</b>
          </div>
          <span className={styles.transformArrow}>→</span>
          <strong>z′</strong>
        </div>
      </section>

      <section id="match-engine" className={`${styles.section} ${styles.matchSection}`}>
        <div className={styles.matchHeading}>
          <p className={styles.eyebrow}>MATCH ENGINE</p>
          <h2>RANDOM, BUT REPRODUCIBLE.</h2>
          <p>
            Football needs uncertainty. The engine still needs to be reproducible. A seed gives it both.
          </p>
        </div>

        <div className={styles.functionCard}>
          <div className={styles.functionRow}>
            <span>RESULT</span>
            <strong>=</strong>
            <strong>F(team A, team B, managers, era, state, σ)</strong>
          </div>
          <div className={styles.functionLegend}>
            <span>σ is the simulation seed</span>
            <span>football inputs first, seeded randomness after</span>
          </div>
        </div>

        <div className={styles.enginePipeline}>
          {[
            ["01", "PLAYERS", "Tournament versions"],
            ["02", "FIT", "Position and structure"],
            ["03", "TEAM", "Chemistry and balance"],
            ["04", "CONTEXT", "Manager and era"],
            ["05", "STATE", "Score, time, fatigue"],
            ["06", "SEED", "Reproducible variance"],
          ].map(([index, title, copy]) => (
            <div key={index} className={styles.engineStep}>
              <span>{index}</span>
              <strong>{title}</strong>
              <small>{copy}</small>
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

      <section id="match-state" className={`${styles.section} ${styles.stateSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>MATCH STATE</p>
          <h2>THE NEXT EVENT DEPENDS ON WHAT IS TRUE RIGHT NOW.</h2>
          <p>
            The match keeps changing after kickoff. Score, time, shots, xG, cards, fatigue and substitutions reshape what matters next.
          </p>
        </div>
        <MatchStateLab />
        <div className={styles.stateRule}>
          <span className={styles.stateRuleLabel}>THE RULE</span>
          <p className={styles.pullQuote}>
            A stronger side can move the probabilities. It never gets promised a win.
          </p>
        </div>
      </section>

      <section id="bench" className={`${styles.section} ${styles.benchSection}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>BENCH</p>
            <h2>THE BENCH CHANGES WITH THE MATCH.</h2>
            <p>
              The right substitute changes with the match. Score, time, fatigue, fit and manager behavior determine what the bench needs to solve next.
            </p>
          </div>

          <div className={styles.subFunction}>
            <span>SUBSTITUTION DECISION</span>
            <strong>B(s<sub>t</sub>, manager, bench, fit, fatigue, σ)</strong>
            <div className={styles.subTags}>
              <i>CHASE</i><i>PROTECT</i><i>FRESH LEGS</i><i>FIT</i><i>EXTRA TIME</i>
            </div>
          </div>
        </div>
      </section>

      <section id="testing" className={`${styles.section} ${styles.integritySection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>TESTING</p>
          <h2>IF THE MODEL CHANGES, THE TESTS SHOULD CATCH IT.</h2>
          <p>
            Reproducible simulation makes regressions easier to isolate. Historical data is validated before release, with Vitest and Playwright covering simulation, tournament progression and product integrity.
          </p>
        </div>

        <div className={styles.integrityGrid}>
          <article><span>SIMULATION</span><strong>SEEDED</strong><p>Same inputs can reproduce the same path when a regression needs to be isolated.</p></article>
          <article><span>DATA</span><strong>VALIDATED</strong><p>Duplicate identities, unsupported records and asset mismatches are caught before release.</p></article>
          <article><span>PRODUCT</span><strong>47 TEST FILES</strong><p>Vitest and Playwright cover the engine, progression and product integrity.</p></article>
        </div>
      </section>

      <section id="delivery" className={`${styles.section} ${styles.infrastructureSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>DELIVERY</p>
          <h2>FAST MATH STILL NEEDS A FAST PRODUCT.</h2>
          <p>
            The game runs in Next.js and TypeScript. Player assets move through S3 and CloudFront, while Vercel and Cloudflare handle the product around the simulator.
          </p>
        </div>

        <div className={styles.architecture}>
          <div><span>PRODUCT</span><strong>NEXT.JS + TYPESCRIPT</strong></div>
          <span>→</span>
          <div><span>ENGINE</span><strong>STATE + SIMULATION</strong></div>
          <span>→</span>
          <div><span>ASSETS</span><strong>S3 + CLOUDFRONT</strong></div>
          <span>→</span>
          <div><span>DELIVERY</span><strong>VERCEL + CLOUDFLARE</strong></div>
        </div>

        <div className={styles.performanceRail}>
          <span><strong>200 / 200</strong> TEST REQUESTS</span>
          <span><strong>86 ms</strong> MEDIAN RESPONSE START</span>
          <span><strong>95%</strong> UNDER 374 ms</span>
        </div>
      </section>

      <section id="idea" className={`${styles.section} ${styles.thesisSection}`}>
        <p className={styles.eyebrow}>THE IDEA</p>
        <div className={styles.thesisLead}>
          <h2>BUILD THE BETTER XI. GET THE BETTER CHANCE. NOT A GUARANTEED WIN.</h2>
        </div>

        <div className={styles.ideaGrid}>
          <article>
            <strong>DECISIONS MATTER</strong>
            <p>Draft, roles, manager, era and bench change the match.</p>
          </article>
          <article>
            <strong>UPSETS STAY ALIVE</strong>
            <p>Better teams get better odds. They do not get guaranteed wins.</p>
          </article>
          <article>
            <strong>RESULTS CAN BE REPLAYED</strong>
            <p>A seed can reproduce the same simulation path.</p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.finalCta}`}>
        <p className={styles.eyebrow}>ENOUGH THEORY</p>
        <h2>BUILD AN XI.</h2>
        <p>Then see if the model agrees with you.</p>
        <Link href="/play" className={styles.ctaButton}>START DRAFT</Link>
        <div className={styles.finalRail}>1,832 CARDS · 15 CHAMPIONS · ONE ENGINE</div>
      </section>
    </main>
  );
}