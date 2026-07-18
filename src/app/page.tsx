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
import { historicalOpponents } from "@/data/opponents";
import { flagForCountry } from "@/lib/utils";

const steps = [
  {
    number: "01",
    title: "Choose conditions",
    copy: "Set the match environment without closing any archive wing.",
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
    title: "Draft fourteen",
    copy: "Fill the pitch in your order, then assign and reorder three substitutes.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Challenge history",
    copy: "Choose any nation-year opponent and follow every substitution and chance.",
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
                  <b>310</b> tournament cards
                </span>
                <span>
                  <b>416</b> sourced participants
                </span>
                <span>
                  <b>2</b> player respins
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
                <h2>Fourteen players. One match.</h2>
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
                <h2>Fourteen tournament champions.</h2>
              </div>
              <p>Every participant is playable; the champions mark each archive wing.</p>
            </div>
            <div className="champion-grid">
              {historicalOpponents
                .filter((opponent) => opponent.tournamentFinish === "champion")
                .map((champion, index) => (
                <article
                  className="champion-tile champion-tile--active"
                  key={champion.id}
                >
                  <div className="champion-tile__top">
                    <span className="champion-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="status-live">Playable</span>
                  </div>
                  <span className="champion-flag" aria-hidden>
                    {flagForCountry(champion.nationCode)}
                  </span>
                  <p>{champion.tournamentYear}</p>
                  <h3>
                    {flagForCountry(champion.nationCode)}{" "}
                    {champion.nationName}
                  </h3>
                  <span>{champion.tacticalProfile}</span>
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
