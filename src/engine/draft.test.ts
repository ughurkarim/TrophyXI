import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { players } from "@/data/players";
import {
  generateDraftOptions,
  getPositionFit,
  hasDuplicatePlayers,
  hasDuplicatePicks,
  isEligibleForSlot,
} from "@/engine/draft";

describe("draft engine", () => {
  const formation = getFormation("4-3-3");

  it("enforces position eligibility", () => {
    const goalkeeper = players.find((player) => player.id === "manuel-neuer-2014")!;
    const striker = players.find((player) => player.id === "ronaldo-2002")!;
    expect(isEligibleForSlot(goalkeeper, formation.slots[0])).toBe(true);
    expect(isEligibleForSlot(striker, formation.slots[0])).toBe(false);
    expect(isEligibleForSlot(striker, formation.slots[9])).toBe(true);
  });

  it("scores exact, strong, secondary, adjacent, and emergency fits", () => {
    const exact = players.find((player) => player.id === "fabio-cannavaro-2006")!;
    const fullback = players.find((player) => player.id === "roberto-carlos-2002")!;
    expect(getPositionFit(exact, formation.slots[2])).toBe(94);
    expect(getPositionFit(fullback, formation.slots[1])).toBe(100);
    expect(getPositionFit(fullback, formation.slots[8])).toBeGreaterThanOrEqual(68);
    expect(getPositionFit(fullback, formation.slots[0])).toBe(0);
  });

  it("returns exactly three deterministic, valid options", () => {
    const options = generateDraftOptions(players, formation.slots[1], [], 1234, 1);
    const repeat = generateDraftOptions(players, formation.slots[1], [], 1234, 1);
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.id)).toEqual(
      repeat.map((option) => option.id),
    );
    expect(options.every((option) => isEligibleForSlot(option, formation.slots[1]))).toBe(
      true,
    );
  });

  it("prevents already drafted versions from returning", () => {
    const first = generateDraftOptions(players, formation.slots[5], [], 2026, 5);
    const next = generateDraftOptions(
      players,
      formation.slots[6],
      [first[0].id],
      2026,
      6,
    );
    expect(next.map((option) => option.id)).not.toContain(first[0].id);
    expect(
      hasDuplicatePicks([
        { slotId: "cm", cardId: first[0].id },
        { slotId: "rcm", cardId: first[0].id },
      ]),
    ).toBe(true);
  });

  it("prevents two tournament versions of the same player", () => {
    const options = generateDraftOptions(
      players,
      formation.slots[10],
      ["kylian-mbappe-2018"],
      2026,
      10,
    );
    expect(options.map((option) => option.id)).not.toContain("kylian-mbappe-2022");
    expect(
      hasDuplicatePlayers(
        [
          { slotId: "lw", cardId: "kylian-mbappe-2018" },
          { slotId: "rw", cardId: "kylian-mbappe-2022" },
        ],
        players,
      ),
    ).toBe(true);
  });
});
