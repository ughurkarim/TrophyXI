import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { Wordmark } from "@/components/brand/mark";
import { playersById } from "@/data/players";
import { flagForCountry } from "@/lib/utils";
import styles from "./mobile-landing.module.css";

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
  return (
    <div className={styles.root} data-testid="mobile-landing">
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Trophy XI home">
          <Wordmark />
        </Link>
        <Link href="/database" className={styles.databaseLink}>
          <Search size={17} aria-hidden />
          Players
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="mobile-hero-title">
          <div className={styles.atmosphere} aria-hidden />
          <div className={styles.copy}>
            <h1 id="mobile-hero-title">
              Build your XI.
              <span>Beat history.</span>
            </h1>
            <p className={styles.lede}>
              Draft fourteen tournament greats, shape your team, and play the
              World Cup champions in a complete match simulation.
            </p>
          </div>

          <div className={styles.playerStage} aria-label="Featured players">
            {heroPlayers.map((player, index) => (
              <article
                key={player.id}
                className={styles.player}
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
              Play Trophy XI <ArrowRight size={18} aria-hidden />
            </Link>
            <p>No waiting. Your first decision starts now.</p>
          </div>
        </section>

        <section className={styles.how} aria-labelledby="mobile-how-title">
          <p className={styles.sectionLabel}>ONE RUN · FOUR DECISIONS</p>
          <h2 id="mobile-how-title">From archive to final.</h2>
          <ol>
            <li><b>01</b><span><strong>Set the era</strong>Choose the match environment.</span></li>
            <li><b>02</b><span><strong>Pick the mind</strong>Appoint your tournament manager.</span></li>
            <li><b>03</b><span><strong>Build the squad</strong>Draft an XI and three substitutes.</span></li>
            <li><b>04</b><span><strong>Play the match</strong>Challenge history or enter the World Cup.</span></li>
          </ol>
        </section>
      </main>
    </div>
  );
}
