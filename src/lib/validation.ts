import { z } from "zod";
import { POSITIONS } from "@/types/game";

const rating = z.number().int().min(1).max(99);
const nullableCount = z.number().int().min(0).nullable();

const citationSchema = z.object({
  label: z.string().min(2),
  url: z.string().url(),
  publisher: z.string().min(2),
  accessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const playerCardSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  playerIdentityId: z.string().regex(/^[a-z0-9-]+$/),
  playerName: z.string().min(2),
  countryCode: z.string().length(3),
  countryName: z.string().min(2),
  confederation: z.enum(["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]),
  tournamentYear: z.union([
    z.literal(1970),
    z.literal(1974),
    z.literal(1978),
    z.literal(1982),
    z.literal(1986),
    z.literal(1990),
    z.literal(1994),
    z.literal(1998),
    z.literal(2002),
    z.literal(2006),
    z.literal(2010),
    z.literal(2014),
    z.literal(2018),
    z.literal(2022),
  ]),
  primaryPosition: z.enum(POSITIONS),
  eligiblePositions: z.array(z.enum(POSITIONS)).min(1),
  overall: rating,
  attributes: z.object({
    attack: rating,
    creativity: rating,
    control: rating,
    defense: rating,
    physical: rating,
    goalkeeping: rating,
    clutch: rating,
  }),
  era: z.enum(["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]),
  archetype: z.string().min(2),
  qualityBand: z.enum([
    "iconic",
    "elite",
    "standout",
    "reliable",
    "role-player",
    "limited",
  ]),
  statusTier: z.enum([
    "legend",
    "icon",
    "elite",
    "standout",
    "reliable",
    "role-player",
    "limited",
  ]),
  modeledTags: z.array(z.string().min(2)).min(1).max(4),
  isDraftEligible: z.boolean(),
  draftIneligibilityReason: z.string().min(2).nullable(),
  tournamentStats: z.object({
    appearances: nullableCount,
    starts: nullableCount,
    minutes: nullableCount,
    goals: nullableCount,
    assists: nullableCount,
    cleanSheets: nullableCount,
    saves: nullableCount,
  }),
  statSources: z.array(citationSchema),
  achievements: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      label: z.string().min(2),
      description: z.string().min(2),
      ratingEffect: z.number().min(0).max(1),
      source: citationSchema,
    }),
  ),
  careerAccolades: z.array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      label: z.string().min(2),
      count: z.number().int().min(1),
      description: z.string().min(2),
      source: citationSchema,
    }),
  ),
  top100Player: z.boolean(),
  imageId: z.string().regex(/^[a-z0-9-]+$/),
  eraLegacy: z.enum([
    "era-specialist",
    "adaptable",
    "cross-era",
    "timeless",
  ]),
  eraTranslation: z.object({
    timelessness: rating,
    physicalAdaptability: rating,
    technicalAdaptability: rating,
    tacticalAdaptability: rating,
    pressingAdaptability: rating,
    tempoAdaptability: rating,
    equipmentAdaptability: rating,
    refereeingAdaptability: rating,
  }),
});

export const playerSeedSchema = z.array(playerCardSchema).superRefine((cards, context) => {
  const ids = new Set<string>();
  cards.forEach((card, index) => {
    if (ids.has(card.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate player card id: ${card.id}`,
        path: [index, "id"],
      });
    }
    ids.add(card.id);
    if (!card.eligiblePositions.includes(card.primaryPosition)) {
      context.addIssue({
        code: "custom",
        message: "Eligible positions must include the primary position",
        path: [index, "eligiblePositions"],
      });
    }
    const hasKnownStats = Object.values(card.tournamentStats).some(
      (value) => value !== null,
    );
    if (hasKnownStats && card.statSources.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Known tournament statistics require a source",
        path: [index, "statSources"],
      });
    }
  });
});
