import { describe, expect, it } from "vitest";
import {
  calculateEraFit,
  calculateEraFitDetails,
  draftEras,
  eraFitFloorForRating,
  eraPenaltyResistanceForRating,
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

  it("keeps the compact era selector labels and playstyle copy exact", () => {
    expect(
      draftEras.map(({ id, accent, description }) => ({
        id,
        accent,
        description,
      })),
    ).toEqual([
      {
        id: "2020s",
        accent: "Electric Cyan",
        description:
          "High pressing, rapid transitions, hybrid roles, and technical goalkeepers.",
      },
      {
        id: "2010s",
        accent: "Royal Violet",
        description:
          "Structured pressing, positional play, technical midfields, and flexible attacks.",
      },
      {
        id: "2000s",
        accent: "Trophy Gold",
        description:
          "Explosive pace, powerful specialists, and increasingly fluid possession football.",
      },
      {
        id: "1990s",
        accent: "Burnt Amber",
        description:
          "Defensive organization, athletic duels, quick transitions, and contrasting systems.",
      },
      {
        id: "1980s",
        accent: "Deep Crimson",
        description:
          "Creative playmakers, compact marking, physical battles, and direct counterattacks.",
      },
      {
        id: "1970s",
        accent: "Archive Gray",
        description:
          "Heavy challenges, slower pitches, aerial duels, and individual invention.",
      },
      {
        id: "all",
        accent: "Ivory Gold",
        description:
          "Balanced conditions with minimal era penalty and greater emphasis on adaptability.",
      },
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

  it("keeps every active card's Era Fit between 70 and 100", () => {
    for (const player of players) {
      for (const era of draftEras) {
        const fit = calculateEraFit(player, era.id);
        expect(
          fit,
          `${player.id} in ${era.id}`,
        ).toBeGreaterThanOrEqual(70);
        expect(
          fit,
          `${player.id} in ${era.id}`,
        ).toBeLessThanOrEqual(100);
      }
    }
  });

  it("uses the specified rating floors and quality resistance bands", () => {
    expect(
      [99, 96, 95, 92, 91, 88, 87, 84, 83, 80, 79].map((rating) => [
        eraFitFloorForRating(rating),
        eraPenaltyResistanceForRating(rating),
      ]),
    ).toEqual([
      [92, 0.25],
      [92, 0.25],
      [88, 0.4],
      [88, 0.4],
      [84, 0.55],
      [84, 0.55],
      [80, 0.7],
      [80, 0.7],
      [76, 0.85],
      [76, 0.85],
      [70, 1],
    ]);
  });

  it("gives elite cards more distant-era resilience than weaker cards", () => {
    const base = players.find((player) => player.id === "dele-alli-2018")!;
    const elite = { ...base, overall: 99 };
    const weaker = { ...base, overall: 73 };
    const eliteFit = calculateEraFitDetails(elite, "1970s");
    const weakerFit = calculateEraFitDetails(weaker, "1970s");
    expect(eliteFit.rawFit).toBe(weakerFit.rawFit);
    expect(eliteFit.fit).toBeGreaterThanOrEqual(92);
    expect(eliteFit.fit).toBeGreaterThan(weakerFit.fit);
    expect(eliteFit.impactPercent).toBeLessThan(
      weakerFit.impactPercent,
    );
  });
});
