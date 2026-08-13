import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { Wordmark } from "@/components/brand/mark";
import { playersById } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
import styles from "./mobile-landing.module.css";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/navigation/language-selector";

const heroPlayerIds = [
  "lionel-messi-2026",
  "lamine-yamal-2026",
  "pele-1970",
] as const;

const heroPlayers = heroPlayerIds.map((id) => {
  const player = playersById.get(id);
  if (!player) throw new Error(`Missing mobile hero player ${id}`);
  return player;
});

export function MobileLanding() {
  const t = useTranslations("landing.mobile");
  const common = useTranslations("common");
  return (
    <div className={styles.root} data-testid="mobile-landing">
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={common("brandHome")}>
          <Wordmark />
        </Link>
        <div className={styles.headerActions}>
          <Link href="/database" className={styles.databaseLink}>
            <Search size={17} aria-hidden />
            {common("players")}
          </Link>
          <LanguageSelector compact />
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="mobile-hero-title">
          <div className={styles.atmosphere} aria-hidden />
          <div className={styles.copy}>
            <h1 id="mobile-hero-title">
              {t("build")}
              <span>{t("beat")}</span>
            </h1>
            <p className={styles.lede}>
              {t("lede")}
            </p>
          </div>

          <div className={styles.playerStage} aria-label={t("featuredPlayers")}>
            {heroPlayers.map((player, index) => (
              <article
                key={player.id}
                className={styles.player}
                data-player-id={player.id}
                data-featured={index === 1 ? "true" : undefined}
              >
                <span className={styles.rating}>{player.overall}</span>
                <CircularPortrait
                  imageId={player.imageId}
                  subjectName={player.playerName}
                  era={player.era}
                  statusTier={player.statusTier}
                  countryCode={player.countryCode}
                  tournamentYear={player.tournamentYear}
                  size="hero"
                />
                <div>
                  <strong>{player.playerName}</strong>
                  <span>
                    {flagForCountry(player.countryCode)} {player.primaryPosition}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.actions}>
            <Link href="/play" className={styles.primaryAction}>
              {t("play")} <ArrowRight size={18} aria-hidden />
            </Link>
            <p>{t("noWaiting")}</p>
          </div>
        </section>

        <section className={styles.how} aria-labelledby="mobile-how-title">
          <p className={styles.sectionLabel}>{t("fourDecisions")}</p>
          <h2 id="mobile-how-title">{t("archiveToFinal")}</h2>
          <ol>
            <li><b>01</b><span><strong>{t("steps.era.title")}</strong>{t("steps.era.copy")}</span></li>
            <li><b>02</b><span><strong>{t("steps.manager.title")}</strong>{t("steps.manager.copy")}</span></li>
            <li><b>03</b><span><strong>{t("steps.squad.title")}</strong>{t("steps.squad.copy")}</span></li>
            <li><b>04</b><span><strong>{t("steps.match.title")}</strong>{t("steps.match.copy")}</span></li>
          </ol>
        </section>
      </main>
    </div>
  );
}
