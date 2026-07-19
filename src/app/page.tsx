import {
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { HeroShowcase } from "@/components/landing/hero-showcase";
import {
  HowItWorksStepCard,
  type HowItWorksStepIcon,
} from "@/components/landing/how-it-works-step-card";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ButtonLink } from "@/components/ui/button";
import { landingChampions } from "@/data/landing-champions";
import { players } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
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
                Draft legendary tournament performances and test your team against
                the greatest champions in World Cup history.
              </p>
              <div className="hero__actions">
                <ButtonLink href="/play">
                  Build your XI <ArrowRight size={17} aria-hidden />
                </ButtonLink>
                <ButtonLink href="/#how-it-works" variant="secondary">
                  See how it works <ChevronRight size={16} aria-hidden />
                </ButtonLink>
              </div>
              <div className="hero__proof" aria-label="Game highlights">
                <span>
                  <b>{players.length}</b> tournament cards
                </span>
                <span>
                  <b>14</b> World Cup champions
                </span>
                <span>
                  <b>2</b> player respins
                </span>
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
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--gold">CHAMPION GAUNTLET</p>
                <h2>Fourteen tournament champions.</h2>
              </div>
              <p>Every participant is playable; the champions mark each archive wing.</p>
            </div>
            <div className={styles.championGrid}>
              {landingChampions.map((champion, index) => (
                <article
                  className={`champion-tile champion-tile--active ${styles.championCard}`}
                  key={champion.id}
                  tabIndex={0}
                  aria-label={`${champion.nationName} ${champion.tournamentYear}, playable champion`}
                >
                  <div className="champion-tile__top">
                    <span className="champion-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="status-live">Playable</span>
                  </div>
                  <div className={`champion-country ${styles.championCountry}`}>
                    <strong>
                      {champion.nationCode}{" "}
                      <i aria-hidden>
                        {flagForCountry(champion.nationCode)}
                      </i>
                    </strong>
                    <h3>{champion.nationName}</h3>
                  </div>
                  <p className={styles.championYear}>
                    {champion.tournamentYear}
                  </p>
                  <p className={styles.championFact}>
                    {champion.championFact}
                  </p>
                </article>
              ))}
            </div>
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
                  {landingChampions.map((champion) => (
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
