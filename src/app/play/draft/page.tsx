"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { DraftBoard } from "@/components/draft/draft-board";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { getDraftEra } from "@/data/eras";
import { useGameStore } from "@/store/game-store";

export default function DraftPage() {
  const router = useRouter();
  const t = useTranslations("draft");
  const hydrated = useGameStore((state) => state.hasHydrated);
  const eraId = useGameStore((state) => state.eraId);
  const managerId = useGameStore((state) => state.managerId);
  const formationId = useGameStore((state) => state.formationId);

  useEffect(() => {
    if (!hydrated) return;
    if (!eraId) router.replace("/play/era");
    else if (!managerId) router.replace("/play/manager");
    else if (!formationId) router.replace("/play/formation");
  }, [eraId, formationId, hydrated, managerId, router]);

  if (!hydrated || !eraId || !managerId || !formationId) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">{t("loading")}</p>
      </main>
    );
  }

  const era = getDraftEra(eraId);
  return (
    <div className={`game-page game-page--draft game-page--stadium ${era.themeClass}`}>
      <GameHeader step={t("step")} />
      <SaveNotice />
      <main className="container game-main">
        <DraftBoard />
      </main>
    </div>
  );
}
