import { ArrowRight, ChevronRight } from "lucide-react";
import { ChampionHistoryShowcase } from "@/components/landing/champion-history-showcase";
import { HeroShowcase } from "@/components/landing/hero-showcase";
import {
  HowItWorksStepCard,
  type HowItWorksStepIcon,
} from "@/components/landing/how-it-works-step-card";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ButtonLink } from "@/components/ui/button";
import {
  confirmedLandingChampions,
  landingChampions,
} from "@/data/landing-champions";
import { players } from "@/data/players";
import styles from "./landing-page.module.css";

const steps = [
  {
    number: "01",
    title: "SET THE STAGE",
    copy: "Choose the footballing era and match conditions. Every player must adapt to the same environment.",
    icon: "stage",
  },
  {
    number: "02",
    title: "CHOOSE THE MIND",
    copy: "Appoint a tournament manager whose tactics, leadership, attack, and defense shape your team.",
    icon: "manager",
  },
  {
    number: "03",
    title: "BUILD YOUR XI",
    copy: "Draft eleven starters and three substitutes. Balance talent, chemistry, position fit, and bench coverage.",
    icon: "squad",
  },
  {
    number: "04",
    title: "CHALLENGE HISTORY",
    copy: "Choose a nation-year opponent and test your squad against one of the greatest World Cup champions.",
    icon: "challenge",
  },
] satisfies Array<{
  number: string;
  title: string;
  copy: string;
  icon: HowItWorksStepIcon;
}>;

export default function LandingPage() {
  return (
    <>
      <SiteHeader fixed />
      <main>
        <section className="hero">
          <HeroShowcase>
            <div className="hero__copy">
              <p className="eyebrow eyebrow--gold">THE WORLD CUP XI SIMULATOR</p>
              <h1>
                BUILD THE XI.
                <br />
                <span>BEAT HISTORY.</span>
              </h1>
              <p className="hero__lede">
                Draft tournament-specific legends, build a balanced XI, and test
                it against every World Cup champion since 1970.
              </p>
              <div className="hero__actions">
                <ButtonLink href="/play" className={styles.heroPrimaryCta}>
                  Build your XI <ArrowRight size={17} aria-hidden />
                </ButtonLink>
                <ButtonLink
                  href="/#how-it-works"
                  variant="secondary"
                  className={styles.heroSecondaryCta}
                >
                  See how it works <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>
              <div className="hero__proof" aria-label="Game highlights">
                <span>
                  <b>{players.length}</b> TOURNAMENT CARDS
                </span>
                <span>
                  <b>15</b> WORLD CUP CHAMPIONS
                </span>
                <span>DETERMINISTIC MATCH ENGINE</span>
              </div>
            </div>
          </HeroShowcase>
        </section>

        <section className="section how-it-works" id="how-it-works">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE DRESSING ROOM</p>
                <h2 className={styles.stepsHeading}>
                  FOURTEEN PLAYERS. ONE MATCH.
                </h2>
              </div>
            </div>
            <div className={styles.stepsGrid}>
              {steps.map((step) => (
                <HowItWorksStepCard key={step.number} {...step} />
              ))}
            </div>
          </div>
        </section>

        <section className="section champions-section" id="champions">
          <div className="container">
            <div className={`section-heading ${styles.championsHeading}`}>
              <div>
                <p className="eyebrow eyebrow--gold">THE WINNERS’ ARCHIVE</p>
                <h2>World champions, framed in gold.</h2>
              </div>
              <p>
                A complete tournament timeline from 2026 back to the team that
                made football look like art in 1970.
              </p>
            </div>
            <ChampionHistoryShowcase champions={landingChampions} />
          </div>
        </section>

        <section
          className={styles.finalCta}
          aria-labelledby="landing-final-cta-title"
        >
          <div className={`container ${styles.finalPanel}`}>
            <div className={styles.tunnelLight} aria-hidden />
            <div className={styles.finalCopy}>
              <p className="eyebrow eyebrow--gold">THE CHALLENGE AWAITS</p>
              <h2 id="landing-final-cta-title">
                BUILD THE TEAM
                <br />
                THAT COULD <span>BEAT THEM ALL.</span>
              </h2>
              <p className={styles.finalSupport}>
                Draft fourteen tournament versions, shape them into one balanced
                squad, and take on the champions who defined World Cup history.
              </p>
              <div className={styles.finalActions}>
                <ButtonLink
                  href="/play"
                  className={styles.primaryCta}
                >
                  BUILD MY XI <ArrowRight size={17} aria-hidden />
                </ButtonLink>
                <ButtonLink
                  href="/#champions"
                  variant="ghost"
                  className={styles.secondaryCta}
                >
                  VIEW THE CHAMPIONS
                  <ChevronRight size={16} aria-hidden />
                </ButtonLink>
              </div>
            </div>
            <div className={styles.opponentWall}>
              <div className={styles.pitchGraphic} aria-hidden>
                <span className={styles.pitchHalfway} />
                <span className={styles.pitchCircle} />
                <span className={styles.pitchPath} />
              </div>
              <p className="eyebrow">THE CHAMPIONS AHEAD</p>
              <div className={styles.markerScroller}>
                <div className={styles.markerGrid}>
                  {confirmedLandingChampions.map((champion) => (
                    <button
                      className={styles.championMarker}
                      type="button"
                      key={`marker-${champion.id}`}
                      aria-label={`${champion.nationName} ${champion.tournamentYear}, ${champion.tacticalLabel}`}
                    >
                      <b>{champion.nationCode}</b>
                      <span>{champion.tournamentYear}</span>
                      <i aria-hidden>
                        <strong>{champion.nationName}</strong>
                        {champion.tournamentYear} · {champion.tacticalLabel}
                      </i>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
