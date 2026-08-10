import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import styles from "../trust-page.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for Trophy XI.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Trophy XI privacy</p>
          <h1 className={styles.title}>Privacy.</h1>
          <p className={styles.lede}>
            Trophy XI is designed to work without requiring a user account for normal
            gameplay.
          </p>

          <section className={styles.section}>
            <h2>Game progress</h2>
            <p>
              Trophy XI may store game and preference state in your browser&apos;s local
              storage so a session can survive navigation or a refresh. This information
              stays in the browser unless another feature explicitly sends it elsewhere.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Analytics and performance</h2>
            <p>
              The site uses Vercel Analytics and Vercel Speed Insights to understand site
              usage and performance. Those services may process technical usage information
              according to Vercel&apos;s own privacy practices.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Changes</h2>
            <p>
              This page should be updated if Trophy XI later adds accounts, advertising,
              payments, user uploads, or other features that materially change what data is
              collected or processed.
            </p>
          </section>

          <Link className={styles.back} href="/">
            ← Back to Trophy XI
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
