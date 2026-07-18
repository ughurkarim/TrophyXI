import type { RandomSource } from "@/engine/random";

const openingLines = [
  "The shapes settle as both midfields test the space.",
  "A patient opening, with neither side conceding the center.",
  "The early press sets a sharp tournament tempo.",
];

const controlLines = {
  user: [
    "Trophy XI move the ball with growing authority.",
    "Your midfield finds room between Spain’s lines.",
    "The drafted XI begin to dictate the rhythm.",
  ],
  opponent: [
    "Spain compress the pitch and recycle possession.",
    "Spain’s midfield triangles are beginning to take hold.",
    "Patient Spanish possession pulls the shape from side to side.",
  ],
};

export const openingCommentary = (random: RandomSource) =>
  openingLines[Math.floor(random() * openingLines.length)];

export const controlCommentary = (
  team: "user" | "opponent",
  random: RandomSource,
) => {
  const options = controlLines[team];
  return options[Math.floor(random() * options.length)];
};

export const goalCommentary = (
  scorer: string,
  assist: string | undefined,
  team: "user" | "opponent",
) => {
  const lead = team === "user" ? "Trophy XI strike" : "Spain find the breakthrough";
  return assist ? `${lead}. ${scorer}, created by ${assist}.` : `${lead}. ${scorer} finishes.`;
};
