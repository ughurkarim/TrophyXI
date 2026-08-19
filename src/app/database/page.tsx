import type { Metadata } from "next";
import { PlayerDatabase } from "@/components/database/player-database";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import styles from "./database-page.module.css";

export const metadata: Metadata = {
  title: "World Cup Player Database & Ratings",
  description:
    "Explore tournament-specific World Cup player cards and ratings. Search football legends by name, nation, year, position, era, and tier.",
  alternates: {
    canonical: "/database",
  },
};

export default function DatabasePage() {
  return (
    <>
      <div className={styles.header}>
        <SiteHeader />
      </div>
      <main className={`database-page ${styles.page}`}>
        <div className="container">
          <PlayerDatabase />
        </div>
      </main>
      <Footer />
    </>
  );
}
