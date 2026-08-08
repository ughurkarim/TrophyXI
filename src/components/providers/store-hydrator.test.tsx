import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORE_HYDRATION_FAILSAFE_MS,
  StoreHydrator,
} from "@/components/providers/store-hydrator";
import { useGameStore } from "@/store/game-store";

describe("StoreHydrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({ hasHydrated: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("releases the app when persistence hydration never settles", () => {
    vi.spyOn(useGameStore.persist, "rehydrate").mockReturnValue(
      new Promise<void>(() => undefined),
    );

    render(<StoreHydrator />);
    expect(useGameStore.getState().hasHydrated).toBe(false);

    act(() => {
      vi.advanceTimersByTime(STORE_HYDRATION_FAILSAFE_MS);
    });

    expect(useGameStore.getState().hasHydrated).toBe(true);
  });
});
