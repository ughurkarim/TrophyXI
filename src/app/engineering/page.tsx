import type { Metadata } from "next";
import Link from "next/link";
import EraLab from "./EraLab";
import MatchStateLab from "./MatchStateLab";
import ModelExplorer from "./ModelExplorer";
import SeedTrace from "./SeedTrace";
import styles from "./engineering.module.css";

export const metadata: Metadata = {
  title: "Engineering · Trophy XI",
  description:
    "The math and computer science behind Trophy XI: team modeling, era translation, seeded simulation, match state, testing and delivery.",
};

export default function EngineeringPage() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.dashboardLink} aria-label="Back to dashboard">
        <span aria-hidden="true">←</span> DASHBOARD
      </Link>
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
            <p>
              A great XI is more than eleven high rated cards. Position, chemistry, manager, era, bench depth and the current match state
              all change what the team can actually do.
            </p>
            <p>
              The simulator stays unpredictable without becoming impossible to test. Same inputs. Same seed. Same result.
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

      <section className={`${styles.section} ${styles.modelSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>01 · TEAM MODEL</p>
          <h2>A TEAM IS A SYSTEM, NOT A SUM.</h2>
          <p>
            Tournament quality is the starting point. Then the engine looks at where the player is used, how the lineup fits together,
            who manages it, the era around it and what is still available on the bench.
          </p>
        </div>
        <ModelExplorer />
      </section>

      <section className={`${styles.section} ${styles.darkBand}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>02 · POSITION</p>
            <h2>A GREAT PLAYER IN THE WRONG ROLE SHOULD COST YOU.</h2>
            <p>
              Squad building is a constraint problem. Maximize quality, but keep the lineup coherent. Force a player into the wrong role
              and less of that quality is actually usable.
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

      <section className={`${styles.section} ${styles.eraSection}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>03 · ERA TRANSLATION</p>
            <h2>1970 → 2026 IS NOT THE SAME PROBLEM AS 2026 → 1970.</h2>
            <p>
              Era is treated as an environment change, not a permanent advantage for modern football or older legends. The direction of
              the translation matters.
            </p>
          </div>
          <EraLab />
        </div>
      </section>

      <section className={`${styles.section} ${styles.managerSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>04 · MANAGER</p>
          <h2>CHANGE THE MANAGER. CHANGE THE TEAM.</h2>
          <p>
            Offense, defense, tactics and game management change how the same group of players behaves before and during the match.
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

      <section className={`${styles.section} ${styles.matchSection}`}>
        <div className={styles.matchHeading}>
          <p className={styles.eyebrow}>05 · MATCH ENGINE</p>
          <h2>RANDOM, BUT REPRODUCIBLE.</h2>
          <p>
            Football needs variance. The simulator still needs to be debuggable. A seed gives the engine both.
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

      <section className={`${styles.section} ${styles.stateSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>06 · MATCH STATE</p>
          <h2>THE NEXT EVENT DEPENDS ON WHAT IS TRUE RIGHT NOW.</h2>
          <p>
            The match is not decided at kickoff. Score, minute, shots, xG, cards, fatigue and substitutions keep changing the next decision.
            Each event updates the state, then the engine evaluates the next one.
          </p>
        </div>
        <MatchStateLab />
        <p className={styles.pullQuote}>
          A stronger side can move the probabilities. It never gets promised a win.
        </p>
      </section>

      <section className={`${styles.section} ${styles.benchSection}`}>
        <div className={styles.splitGrid}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>07 · BENCH</p>
            <h2>THE BENCH CHANGES WITH THE MATCH.</h2>
            <p>
              The right substitute at 0–0 is not automatically the right substitute at 1–0 or 0–1. Time, fatigue, fit, manager behavior
              and score change what the next substitution needs to solve.
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

      <section className={`${styles.section} ${styles.integritySection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>08 · TESTING</p>
          <h2>IF THE MODEL CHANGES, THE TESTS SHOULD CATCH IT.</h2>
          <p>
            Reproducible simulation makes bugs easier to isolate. Historical data is validated before it reaches the game, with Vitest
            and Playwright covering simulation, tournament progression and integrity paths.
          </p>
        </div>

        <div className={styles.integrityGrid}>
          <article><span>SIMULATION</span><strong>SEEDED</strong><p>Same inputs can reproduce the same path when a regression needs to be isolated.</p></article>
          <article><span>DATA</span><strong>VALIDATED</strong><p>Duplicate identities, unsupported records and asset mismatches are caught before release.</p></article>
          <article><span>PRODUCT</span><strong>40+ TEST FILES</strong><p>Vitest and Playwright cover the engine, progression and product integrity.</p></article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.infrastructureSection}`}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>09 · DELIVERY</p>
          <h2>FAST MATH STILL NEEDS A FAST PRODUCT.</h2>
          <p>
            The game runs in Next.js and TypeScript. Player assets are delivered through S3 and CloudFront, with Vercel and Cloudflare
            handling the product around the simulator.
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

      <section className={`${styles.section} ${styles.thesisSection}`}>
        <p className={styles.eyebrow}>THE IDEA</p>
        <div className={styles.thesisLead}>
          <h2>BUILD THE BETTER XI. GET THE BETTER CHANCE. NOT A GUARANTEED WIN.</h2>
          <p>
            If the best team wins every time, it stops feeling like football. If the choices barely matter, the draft means nothing. Trophy XI has to live between those two.
          </p>
        </div>

        <div className={styles.ideaGrid}>
          <article>
            <span>01</span>
            <strong>DECISIONS MATTER</strong>
            <p>Draft, roles, manager, era and bench all have to move the match.</p>
          </article>
          <article>
            <span>02</span>
            <strong>UPSETS STAY ALIVE</strong>
            <p>Great teams lose. Underdogs steal games. That is part of football.</p>
          </article>
          <article>
            <span>03</span>
            <strong>RESULTS CAN BE REPLAYED</strong>
            <p>Every seed can be rerun, so a weird result can be traced instead of guessed at.</p>
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