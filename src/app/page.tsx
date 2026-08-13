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
import { MobileLanding } from "@/components/mobile/mobile-landing";
import { ButtonLink } from "@/components/ui/button";
import { landingChampions } from "@/data/landing-champions";
import { players } from "@/data/players";
import styles from "./landing-page.module.css";
import { getTranslations } from "next-intl/server";

const steps = [
  {
    number: "01",
    key: "stage",
    icon: "stage",
  },
  {
    number: "02",
    key: "manager",
    icon: "manager",
  },
  {
    number: "03",
    key: "squad",
    icon: "squad",
  },
  {
    number: "04",
    key: "challenge",
    icon: "challenge",
  },
] satisfies Array<{
  number: string;
  key: "stage" | "manager" | "squad" | "challenge";
  icon: HowItWorksStepIcon;
}>;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  return (
    <>
      <MobileLanding />
      <section
        className={styles.mobileEngineeringEntry}
        aria-label={t("engineeringAria")}
        data-testid="mobile-engineering-entry"
      >
        <div className={styles.mobileEngineeringCopy}>
          <span>{t("underHood")}</span>
          <strong>{t("mathMatch")}</strong>
          <small>{t("engineeringDescription")}</small>
        </div>
        <ButtonLink
          href="/engineering"
          variant="secondary"
          className={styles.mobileEngineeringButton}
        >
          {t("engineering")} <ArrowRight size={15} aria-hidden />
        </ButtonLink>
      </section>
      <div className={styles.desktopLanding} data-testid="desktop-landing">
        <SiteHeader fixed />
        <main>
        <section className="hero">
          <HeroShowcase>
            <div className="hero__copy">
              <p className="eyebrow eyebrow--gold">{t("eyebrow")}</p>
              <h1>
                {t("buildXi")}
                <br />
                <span>{t("beatHistory")}</span>
              </h1>
              <p className="hero__lede">
                {t("lede")}
              </p>
              <div className="hero__actions">
                <ButtonLink href="/play" className={styles.heroPrimaryCta}>
                  {t("buildYourXi")} <ArrowRight size={17} aria-hidden />
                </ButtonLink>
                <ButtonLink
                  href="/#how-it-works"
                  variant="secondary"
                  className={styles.heroSecondaryCta}
                >
                  {t("seeHow") } <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>
              <div className="hero__proof" aria-label={t("highlightsAria")}>
                <span>
                  <b>{players.length}</b> {t("tournamentCards")}
                </span>
                <span>
                  <b>15</b> {t("worldCupChampions")}
                </span>
                <span>{t("deterministicEngine")}</span>
              </div>
            </div>
          </HeroShowcase>
        </section>

        <section className="section how-it-works" id="how-it-works">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("dressingRoom")}</p>
                <h2 className={styles.stepsHeading}>
                  {t("fourteenOneMatch")}
                </h2>
              </div>
            </div>
            <div className={styles.stepsGrid}>
              {steps.map((step) => (
                <HowItWorksStepCard key={step.number} number={step.number} icon={step.icon} title={t(`steps.${step.key}.title`)} copy={t(`steps.${step.key}.copy`)} />
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
                <p className="eyebrow eyebrow--gold">{t("winnersArchive")}</p>
                <h2 style={{ maxWidth: "none", whiteSpace: "nowrap" }}>
                  {t("championsHeading")}
                </h2>
              </div>
            </div>
            <ChampionHistoryShowcase champions={landingChampions} />
          </div>
        </section>

        <FinalChallengeShowcase />
        </main>
        <Footer />
      </div>
    </>
  );
}
