"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/mark";
import { MobileGameNav } from "@/components/mobile/mobile-game-nav";
import { LanguageSelector } from "./language-selector";

export function GameHeader({
  step,
  utility,
}: {
  step: string;
  utility?: ReactNode;
}) {
  const t = useTranslations("navigation");
  const common = useTranslations("common");

  return (
    <header className="game-header">
      <div className="container game-header__inner">
        <Link
          className="game-header__brand"
          href="/"
          aria-label={common("brandHome")}
        >
          <Wordmark />
        </Link>
        <div className="game-header__step" aria-label={t("currentSession", { step })}>
          <span>{t("session")}</span>
          <b>{step}</b>
        </div>
        <div className="game-header__utility">
          {utility}
          <LanguageSelector compact />
        </div>
      </div>
      <MobileGameNav step={step} />
    </header>
  );
}
