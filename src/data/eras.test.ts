import { describe, expect, it } from "vitest";
import {
  calculateEraFit,
  draftEras,
  isPlayerInDraftEra,
} from "@/data/eras";
import { formations } from "@/data/formations";
import { players } from "@/data/players";
import { generateDraftOptions, isEligibleForSlot } from "@/engine/draft";

describe("draft eras", () => {
  it("supports a complete, three-choice draft in every era and formation", () => {
    for (const era of draftEras) {
      const pool = players.filter((player) => isPlayerInDraftEra(player, era.id));
      for (const formation of formations) {
        const draftedIds: string[] = [];
        const draftedNames = new Set<string>();
        formation.slots.forEach((slot, index) => {
          const options = generateDraftOptions(
            pool,
            slot,
            draftedIds,
            1998 + index,
            index,
          );
          expect(options, `${era.id} ${formation.id} ${slot.label}`).toHaveLength(3);
          expect(options.every((player) => isEligibleForSlot(player, slot))).toBe(true);
          expect(
            options.every((player) => isPlayerInDraftEra(player, era.id)),
          ).toBe(true);
          expect(
            options.every(
              (player) => !draftedNames.has(player.playerName.toLocaleLowerCase()),
            ),
          ).toBe(true);
          draftedIds.push(options[0].id);
          draftedNames.add(options[0].playerName.toLocaleLowerCase());
        });
        expect(draftedIds).toHaveLength(11);
      }
    }
  });

  it("keeps distant tournament cards draftable in both directions", () => {
    const pele = players.find((player) => player.id === "pele-1970")!;
    const messi = players.find((player) => player.id === "lionel-messi-2022")!;
    expect(isPlayerInDraftEra(messi, "1970s")).toBe(true);
    expect(isPlayerInDraftEra(pele, "2020s")).toBe(true);
    expect(calculateEraFit(messi, "1970s")).toBeGreaterThan(0);
    expect(calculateEraFit(pele, "2020s")).toBeGreaterThan(0);
  });

  it("gives timeless profiles smaller distant-era penalties and neutral mode minimal penalties", () => {
    const base = players.find((player) => player.id === "pele-1970")!;
    const timeless = {
      ...base,
      eraLegacy: "timeless" as const,
      eraTranslation: {
        ...base.eraTranslation,
        timelessness: 96,
      },
    };
    const specialist = {
      ...base,
      eraLegacy: "era-specialist" as const,
      eraTranslation: {
        ...base.eraTranslation,
        timelessness: 65,
      },
    };
    expect(calculateEraFit(timeless, "2020s")).toBeGreaterThan(
      calculateEraFit(specialist, "2020s"),
    );
    expect(calculateEraFit(specialist, "all")).toBeGreaterThanOrEqual(94);
    expect(calculateEraFit(timeless, "2020s")).toBe(
      calculateEraFit(timeless, "2020s"),
    );
  });
});
