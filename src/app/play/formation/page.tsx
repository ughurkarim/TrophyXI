"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FreeFormationPicker } from "@/components/formation/free-formation-picker";
import { FormationSelection } from "@/components/formation/formation-selection";
import { GameHeader } from "@/components/navigation/game-header";
import { SaveNotice } from "@/components/providers/save-notice";
import { getDraftEra } from "@/data/eras";
import { managersById } from "@/data/managers";
import { useGameStore } from "@/store/game-store";
import styles from "./formation-page.module.css";

export default function FormationPage() {
  const router = useRouter();
  const hydrated = useGameStore((state) => state.hasHydrated);
  const gameMode = useGameStore((state) => state.gameMode);
  const eraId = useGameStore((state) => state.eraId);
  const managerId = useGameStore((state) => state.managerId);
  const formationOptionIds = useGameStore((state) => state.formationOptionIds);
  const formationRespinRemaining = useGameStore(
    (state) => state.formationRespinRemaining,
  );
  const respinFormations = useGameStore((state) => state.respinFormations);
  const selectFormation = useGameStore((state) => state.selectFormation);

  useEffect(() => {
    if (!hydrated) return;
    if (!eraId) router.replace("/play/era");
    else if (!managerId) router.replace("/play/manager");
  }, [eraId, hydrated, managerId, router]);

  const manager = managerId ? managersById.get(managerId) : undefined;
  if (!hydrated || !eraId || !manager) {
    return (
      <main className="game-page loading-state">
        <div className="loading-emblem" />
        <p className="eyebrow">PREPARING THE TACTICAL ROOM</p>
      </main>
    );
  }

  return (
    <div className={`game-page game-page--stadium ${getDraftEra(eraId).themeClass}`}>
      <GameHeader step="FORMATION / 03" />
      <SaveNotice />
      <main className={`container game-main ${styles.main}`}>
        {gameMode === "free-selection" ? (
          <FreeFormationPicker
            manager={manager}
            eraId={eraId}
            formationIds={formationOptionIds}
            onContinue={(formationId) => {
              selectFormation(formationId);
              router.push("/play/free-selection");
            }}
          />
        ) : (
          <FormationSelection
            manager={manager}
            eraId={eraId}
            offerIds={formationOptionIds}
            formationRespinRemaining={formationRespinRemaining}
            onRespin={respinFormations}
            onContinue={(formationId) => {
              selectFormation(formationId);
              router.push("/play/draft");
            }}
          />
        )}
      </main>
    </div>
  );
}
