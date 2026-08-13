"use client";

import { ChevronLeft, Database, Home, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./mobile-game-nav.module.css";
import { LanguageSelector } from "@/components/navigation/language-selector";

export function MobileGameNav({ step }: { step: string }) {
  const router = useRouter();
  const t = useTranslations("navigation");
  const common = useTranslations("common");

  return (
    <nav className={styles.nav} aria-label={t("game")}>
      <button type="button" onClick={() => router.back()} aria-label={t("goBack")}>
        <ChevronLeft className={styles.directionalIcon} size={20} aria-hidden />
        <span>{common("back")}</span>
      </button>
      <Link href="/">
        <Home size={19} aria-hidden />
        <span>{common("home")}</span>
      </Link>
      <span
        className={styles.session}
        aria-label={t("currentSession", { step })}
        aria-current="step"
      >
        <Shield size={18} aria-hidden />
        <b>{step.split(" / ")[0]}</b>
      </span>
      <Link href="/database">
        <Database size={19} aria-hidden />
        <span>{common("players")}</span>
      </Link>
      <span className={styles.languageSlot}>
        <LanguageSelector compact />
      </span>
    </nav>
  );
}
