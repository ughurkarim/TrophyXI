import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/navigation/footer";
import { SiteHeader } from "@/components/navigation/site-header";
import styles from "../trust-page.module.css";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("metadataTitle"), description: t("metadataDescription") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.lede}>
            {t("lede")}
          </p>

          <section className={styles.section}>
            <h2>{t("progressTitle")}</h2>
            <p>{t("progressDescription")}</p>
          </section>

          <section className={styles.section}>
            <h2>{t("analyticsTitle")}</h2>
            <p>{t("analyticsDescription")}</p>
          </section>

          <section className={styles.section}>
            <h2>{t("changesTitle")}</h2>
            <p>{t("changesDescription")}</p>
          </section>

          <Link className={styles.back} href="/">
            ← {t("back")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
