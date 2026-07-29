import type { Metadata } from "next";
import { PlayerDatabase } from "@/components/database/player-database";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import styles from "./database-page.module.css";

export const metadata: Metadata = {
  title: "Player Database · Trophy XI",
  description:
    "Search and inspect every draftable Trophy XI tournament card.",
};

export default function DatabasePage() {
  return (
    <>
      <SiteHeader />
      <main className={`database-page ${styles.page}`}>
        <div className="container">
          <PlayerDatabase />
        </div>
      </main>
      <Footer />
    </>
  );
}