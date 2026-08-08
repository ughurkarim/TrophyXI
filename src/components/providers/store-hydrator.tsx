"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";

export const STORE_HYDRATION_FAILSAFE_MS = 1_200;

export function StoreHydrator() {
  useEffect(() => {
    let active = true;
    const finishHydration = () => {
      if (active && !useGameStore.getState().hasHydrated) {
        useGameStore.setState({ hasHydrated: true });
      }
    };
    const failsafe = window.setTimeout(
      finishHydration,
      STORE_HYDRATION_FAILSAFE_MS,
    );

    try {
      void Promise.resolve(useGameStore.persist.rehydrate())
        .catch(() => undefined)
        .finally(() => {
          window.clearTimeout(failsafe);
          finishHydration();
        });
    } catch {
      window.clearTimeout(failsafe);
      finishHydration();
    }

    return () => {
      active = false;
      window.clearTimeout(failsafe);
    };
  }, []);
  return null;
}
