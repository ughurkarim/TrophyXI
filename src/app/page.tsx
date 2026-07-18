import {
  ArrowRight,
  ChevronRight,
  Crosshair,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { HeroShowcase } from "@/components/landing/hero-showcase";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import { ButtonLink } from "@/components/ui/button";
import { champions } from "@/data/champions";

const steps = [
  {
    number: "01",
    title: "Choose an era",
    copy: "Open one tournament wing or release the complete archive.",
    icon: Crosshair,
  },
  {
    number: "02",
    title: "Appoint a manager",
    copy: "Choose one tournament mind and a compatible tactical shape.",
    icon: UsersRound,
  },
  {
    number: "03",
    title: "Draft any position",
    copy: "Fill the pitch in your order with eleven unique identities.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Challenge history",
    copy: "Follow every chance, manager intervention, goal, and decisive kick.",
    icon: Play,
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero__glow" aria-hidden />
          <div className="container hero__grid">
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
                <ButtonLink href="/play/era">
                  Build your XI <ArrowRight size={17} aria-hidden />
                </ButtonLink>
                <ButtonLink href="/#how-it-works" variant="secondary">
                  See how it works <ChevronRight size={16} aria-hidden />
                </ButtonLink>
              </div>
              <div className="hero__proof" aria-label="Game highlights">
                <span>
                  <b>240</b> tournament cards
                </span>
                <span>
                  <b>28</b> manager cards
                </span>
                <span>
                  <b>1</b> history to rewrite
                </span>
              </div>
            </div>
            <HeroShowcase />
          </div>
        </section>

        <section className="section how-it-works" id="how-it-works">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE DRESSING ROOM</p>
                <h2>Eleven choices. One match.</h2>
              </div>
              <p>
                A complete tournament story in minutes, from tactical shape to the
                final whistle.
              </p>
            </div>
            <div className="steps-grid">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <article className="step" key={step.number}>
                    <div className="step__meta">
                      <span>{step.number}</span>
                      <Icon size={18} aria-hidden />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section champions-section" id="champions">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--gold">CHAMPION GAUNTLET</p>
                <h2>Seven rooms in the museum.</h2>
              </div>
              <p>Spain 2010 opens the first door. The rest of history is waiting.</p>
            </div>
            <div className="champion-grid">
              {champions.map((champion, index) => (
                <article
                  className={`champion-tile ${champion.playable ? "champion-tile--active" : ""}`}
                  key={champion.id}
                >
                  <div className="champion-tile__top">
                    <span className="champion-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className={champion.playable ? "status-live" : "status-locked"}>
                      {champion.playable ? "Playable" : "Coming soon"}
                    </span>
                  </div>
                  <span className="champion-flag" role="img" aria-label={champion.countryName}>
                    {champion.flag}
                  </span>
                  <p>{champion.year}</p>
                  <h3>{champion.countryName}</h3>
                  <span>{champion.tacticalIdentity}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container final-cta__panel">
            <div className="final-cta__symbol" aria-hidden>
              <Sparkles />
            </div>
            <p className="eyebrow eyebrow--gold">THE NEXT FIXTURE</p>
            <h2>Your dream XI has never faced a team like this.</h2>
            <ButtonLink href="/play/era">
              Start the draft <ArrowRight size={17} aria-hidden />
            </ButtonLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
