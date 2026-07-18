import { describe, expect, it } from "vitest";
import {
  calculateEraFit,
  draftEras,
  isPlayerInDraftEra,
} from "@/data/eras";
import { formations } from "@/data/formations";
import { players } from "@/data/players";
import { canPlacePlayer, generateDraftOptions } from "@/engine/draft";

describe("draft eras", () => {
  it("orders match environments newest first with Neutral last", () => {
    expect(draftEras.map((era) => era.id)).toEqual([
      "2020s",
      "2010s",
      "2000s",
      "1990s",
      "1980s",
      "1970s",
      "all",
    ]);
  });

  it(
    "supports a complete, five-choice player-first draft in every era and formation",
    () => {
      for (const era of draftEras) {
        const pool = players.filter((player) =>
          isPlayerInDraftEra(player, era.id),
        );
        for (const formation of formations) {
          const picks: Array<{ slotId: string; cardId: string }> = [];
          const draftedNames = new Set<string>();
          formation.slots.forEach((_, index) => {
            const options = generateDraftOptions(
              pool,
              formation,
              picks,
              1998 + index,
              index,
            );
            expect(
              options,
              `${era.id} ${formation.id} round ${index + 1}`,
            ).toHaveLength(5);
            const player = options[0];
            const slot = formation.slots.find(
              (candidate) =>
                !picks.some((pick) => pick.slotId === candidate.id) &&
                canPlacePlayer({
                  cards: pool,
                  formation,
                  picks,
                  player,
                  slot: candidate,
                }),
            );
            expect(slot).toBeDefined();
            expect(
              options.every((player) => isPlayerInDraftEra(player, era.id)),
            ).toBe(true);
            expect(
              options.every(
                (player) =>
                  !draftedNames.has(player.playerName.toLocaleLowerCase()),
              ),
            ).toBe(true);
            picks.push({ slotId: slot!.id, cardId: player.id });
            draftedNames.add(player.playerName.toLocaleLowerCase());
          });
          expect(picks).toHaveLength(11);
        }
      }
    },
    15_000,
  );

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
