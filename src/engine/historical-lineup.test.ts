import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { historicalOpponents } from "@/data/opponents";
import {
  assignHistoricalLineupToFormation,
  canHistoricalPlayerFillSlot,
} from "@/engine/historical-lineup";

describe("historical lineup assignment", () => {
  it("assigns every champion XI to its engine formation", () => {
    for (const champion of historicalOpponents) {
      const formation = getFormation(champion.formation);
      const assigned = assignHistoricalLineupToFormation(
        champion.startingLineup,
        formation,
      );

      expect(assigned, champion.id).not.toBeNull();
      expect(assigned).toHaveLength(11);
      expect(
        assigned!.every((player, index) =>
          canHistoricalPlayerFillSlot(player, formation.slots[index]),
        ),
        champion.id,
      ).toBe(true);
    }
  });

  it("places Argentina 2022 goalkeeper Emiliano Martínez in the GK node", () => {
    const argentina = historicalOpponents.find(
      (opponent) => opponent.id === "argentina-2022",
    )!;
    const formation = getFormation(argentina.formation);
    const assigned = assignHistoricalLineupToFormation(
      argentina.startingLineup,
      formation,
    )!;
    const goalkeeperIndex = formation.slots.findIndex(
      (slot) => slot.position === "GK",
    );

    expect(assigned[goalkeeperIndex].name).toBe("Emiliano Martínez");
    expect(assigned[goalkeeperIndex].position).toBe("GK");
  });
});
