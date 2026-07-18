import { describe, expect, it } from "vitest";
import { draftEras, isPlayerInDraftEra } from "@/data/eras";
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
});
