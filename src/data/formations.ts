import type { Formation, FormationId, FormationSlot, Position } from "@/types/game";

const slot = (
  id: string,
  label: string,
  position: Position,
  accepts: Position[],
  x: number,
  y: number,
): FormationSlot => ({ id, label, position, accepts, x, y });

const goalkeeper = slot("gk", "GK", "GK", ["GK"], 50, 91);

export const formations: Formation[] = [
  {
    id: "4-3-3",
    name: "4–3–3",
    description: "Width up front, a balanced midfield, and a familiar back four.",
    managerStyles: ["possession", "pressing", "fluid", "balanced"],
    eraStrengths: ["all", "modern-masters", "new-generation"],
    tendencies: { attack: 88, control: 82, defense: 78 },
    modifiers: { attack: 2, midfield: 1, defense: 0 },
    slots: [
      goalkeeper,
      slot("lb", "LB", "LB", ["LB", "LWB", "CB"], 14, 70),
      slot("lcb", "LCB", "LCB", ["LCB", "CB"], 38, 75),
      slot("rcb", "RCB", "RCB", ["RCB", "CB"], 62, 75),
      slot("rb", "RB", "RB", ["RB", "RWB", "CB"], 86, 70),
      slot("lcm", "LCM", "CM", ["CM", "DM", "AM"], 27, 48),
      slot("cm", "CM", "CM", ["CM", "DM", "AM"], 50, 54),
      slot("rcm", "RCM", "CM", ["CM", "DM", "AM"], 73, 48),
      slot("lw", "LW", "LW", ["LW", "LM", "CF", "ST"], 17, 20),
      slot("st", "ST", "ST", ["ST", "CF"], 50, 13),
      slot("rw", "RW", "RW", ["RW", "RM", "CF", "ST"], 83, 20),
    ],
  },
  {
    id: "4-2-3-1",
    name: "4–2–3–1",
    description: "A protected back line with three creators behind one focal striker.",
    managerStyles: ["possession", "counter", "balanced", "defensive"],
    eraStrengths: ["all", "modern-masters", "new-generation"],
    tendencies: { attack: 81, control: 90, defense: 84 },
    modifiers: { attack: 0, midfield: 2, defense: 1 },
    slots: [
      goalkeeper,
      slot("lb", "LB", "LB", ["LB", "LWB", "CB"], 14, 70),
      slot("lcb", "LCB", "LCB", ["LCB", "CB"], 38, 75),
      slot("rcb", "RCB", "RCB", ["RCB", "CB"], 62, 75),
      slot("rb", "RB", "RB", ["RB", "RWB", "CB"], 86, 70),
      slot("ldm", "LDM", "DM", ["DM", "CM"], 36, 55),
      slot("rdm", "RDM", "DM", ["DM", "CM"], 64, 55),
      slot("lam", "LAM", "AM", ["AM", "LW", "LM", "CM"], 22, 34),
      slot("cam", "CAM", "AM", ["AM", "CM", "CF"], 50, 30),
      slot("ram", "RAM", "AM", ["AM", "RW", "RM", "CM"], 78, 34),
      slot("st", "ST", "ST", ["ST", "CF"], 50, 12),
    ],
  },
  {
    id: "4-4-2",
    name: "4–4–2",
    description: "Direct, dependable, and built around two complementary forwards.",
    managerStyles: ["direct", "counter", "balanced", "defensive"],
    eraStrengths: ["all", "turn-of-century"],
    tendencies: { attack: 84, control: 74, defense: 86 },
    modifiers: { attack: 1, midfield: -1, defense: 2 },
    slots: [
      goalkeeper,
      slot("lb", "LB", "LB", ["LB", "LWB", "CB"], 14, 70),
      slot("lcb", "LCB", "LCB", ["LCB", "CB"], 38, 75),
      slot("rcb", "RCB", "RCB", ["RCB", "CB"], 62, 75),
      slot("rb", "RB", "RB", ["RB", "RWB", "CB"], 86, 70),
      slot("lm", "LM", "LM", ["LM", "LW", "CM"], 15, 43),
      slot("lcm", "LCM", "CM", ["CM", "DM", "AM"], 39, 49),
      slot("rcm", "RCM", "CM", ["CM", "DM", "AM"], 61, 49),
      slot("rm", "RM", "RM", ["RM", "RW", "CM"], 85, 43),
      slot("lst", "LST", "ST", ["ST", "CF"], 37, 16),
      slot("rst", "RST", "ST", ["ST", "CF"], 63, 16),
    ],
  },
  {
    id: "3-5-2",
    name: "3–5–2",
    description: "Midfield overloads and aggressive wing-backs, with three defenders holding.",
    managerStyles: ["fluid", "pressing", "counter", "direct"],
    eraStrengths: ["all", "turn-of-century", "modern-masters"],
    tendencies: { attack: 86, control: 88, defense: 72 },
    modifiers: { attack: 1, midfield: 2, defense: -1 },
    slots: [
      goalkeeper,
      slot("lcb", "LCB", "LCB", ["LCB", "CB", "LB"], 27, 74),
      slot("cb", "CB", "CB", ["CB", "LCB", "RCB"], 50, 78),
      slot("rcb", "RCB", "RCB", ["RCB", "CB", "RB"], 73, 74),
      slot("lwb", "LWB", "LWB", ["LWB", "LB", "LM"], 12, 47),
      slot("ldm", "LDM", "DM", ["DM", "CM"], 36, 55),
      slot("cam", "CAM", "AM", ["AM", "CM", "CF"], 50, 34),
      slot("rdm", "RDM", "DM", ["DM", "CM"], 64, 55),
      slot("rwb", "RWB", "RWB", ["RWB", "RB", "RM"], 88, 47),
      slot("lst", "LST", "ST", ["ST", "CF", "LW"], 36, 14),
      slot("rst", "RST", "ST", ["ST", "CF", "RW"], 64, 14),
    ],
  },
];

export const getFormation = (id: FormationId) => {
  const formation = formations.find((item) => item.id === id);
  if (!formation) throw new Error(`Unknown formation: ${id}`);
  return formation;
};
