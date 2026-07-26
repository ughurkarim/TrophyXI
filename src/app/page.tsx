import { ArrowRight } from "lucide-react";
import { ChampionHistoryShowcase } from "@/components/landing/champion-history-showcase";
import { FinalChallengeShowcase } from "../components/landing/final-challenge-showcase";
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
            <div
              className={`section-heading ${styles.championsHeading}`}
              style={{ marginBottom: "-40px" }}
            >
              <div>
                <p className="eyebrow eyebrow--gold">THE WINNERS’ ARCHIVE</p>
                <h2 style={{ maxWidth: "none", whiteSpace: "nowrap" }}>
                  World champions, framed in gold.
                </h2>
              </div>
            </div>
            <ChampionHistoryShowcase champions={landingChampions} />
          </div>
        </section>

        <FinalChallengeShowcase />
      </main>
      <Footer />
    </>
  );
}