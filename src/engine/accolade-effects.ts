import type {
  PlayerAccolade,
  PlayerTournamentCard,
  TournamentAchievement,
} from "@/types/game";

export type AccoladeKind =
  | "world-cup-champion"
  | "ballon-dor"
  | "world-cup-golden-ball"
  | "world-cup-golden-boot"
  | "world-cup-golden-glove"
  | "continental-international"
  | "continental-club"
  | "international-individual"
  | "domestic-league"
  | "domestic-cup"
  | "league-individual"
  | "other-individual"
  | "top-100";

export type AccoladeEffect = {
  attack: number;
  midfield: number;
  defense: number;
  chemistry: number;
  leadership: number;
  quality: number;
};

export type PlayerAccoladeItem = {
  id: string;
  label: string;
  count?: number;
  kind: AccoladeKind;
  priority: number;
  effectLabel: string;
  sourceUrl?: string;
  tournament: boolean;
};

const emptyEffect = (): AccoladeEffect => ({
  attack: 0,
  midfield: 0,
  defense: 0,
  chemistry: 0,
  leadership: 0,
  quality: 0,
});

const effectByKind: Record<AccoladeKind, AccoladeEffect> = {
  "world-cup-champion": {
    attack: 0,
    midfield: 0.08,
    defense: 0.12,
    chemistry: 0.72,
    leadership: 0.72,
    quality: 0.18,
  },
  "ballon-dor": {
    attack: 0.5,
    midfield: 0.42,
    defense: 0,
    chemistry: 0.18,
    leadership: 0.52,
    quality: 0.55,
  },
  "world-cup-golden-ball": {
    attack: 0.28,
    midfield: 0.28,
    defense: 0.12,
    chemistry: 0.55,
    leadership: 0.42,
    quality: 0.38,
  },
  "world-cup-golden-boot": {
    attack: 0.7,
    midfield: 0,
    defense: 0,
    chemistry: 0.14,
    leadership: 0.2,
    quality: 0.26,
  },
  "world-cup-golden-glove": {
    attack: 0,
    midfield: 0,
    defense: 0.72,
    chemistry: 0.32,
    leadership: 0.4,
    quality: 0.28,
  },
  "continental-international": {
    attack: 0.08,
    midfield: 0.08,
    defense: 0.08,
    chemistry: 0.38,
    leadership: 0.42,
    quality: 0.18,
  },
  "continental-club": {
    attack: 0.14,
    midfield: 0.14,
    defense: 0.12,
    chemistry: 0.24,
    leadership: 0.24,
    quality: 0.28,
  },
  "international-individual": {
    attack: 0.16,
    midfield: 0.16,
    defense: 0.1,
    chemistry: 0.12,
    leadership: 0.24,
    quality: 0.22,
  },
  "domestic-league": {
    attack: 0.06,
    midfield: 0.1,
    defense: 0.1,
    chemistry: 0.14,
    leadership: 0.14,
    quality: 0.16,
  },
  "domestic-cup": {
    attack: 0.05,
    midfield: 0.05,
    defense: 0.05,
    chemistry: 0.08,
    leadership: 0.1,
    quality: 0.1,
  },
  "league-individual": {
    attack: 0.14,
    midfield: 0.14,
    defense: 0.08,
    chemistry: 0.06,
    leadership: 0.14,
    quality: 0.18,
  },
  "other-individual": {
    attack: 0.08,
    midfield: 0.08,
    defense: 0.06,
    chemistry: 0.04,
    leadership: 0.1,
    quality: 0.12,
  },
  "top-100": {
    attack: 0.06,
    midfield: 0.06,
    defense: 0.06,
    chemistry: 0.1,
    leadership: 0.18,
    quality: 0.14,
  },
};

const priorityByKind: Record<AccoladeKind, number> = {
  "world-cup-champion": 1,
  "ballon-dor": 2,
  "world-cup-golden-ball": 3,
  "world-cup-golden-boot": 4,
  "world-cup-golden-glove": 5,
  "continental-international": 6,
  "continental-club": 7,
  "international-individual": 8,
  "domestic-league": 9,
  "domestic-cup": 10,
  "league-individual": 11,
  "other-individual": 12,
  "top-100": 13,
};

const effectLabelByKind: Record<AccoladeKind, string> = {
  "world-cup-champion": "Composure · leadership · chemistry",
  "ballon-dor": "Creative influence · leadership",
  "world-cup-golden-ball": "Tournament influence · consistency",
  "world-cup-golden-boot": "Finishing · attacking threat",
  "world-cup-golden-glove": "Goalkeeping · defensive organization",
  "continental-international": "International experience · leadership",
  "continental-club": "High-pressure experience",
  "international-individual": "Influence · consistency",
  "domestic-league": "Consistency · tactical discipline",
  "domestic-cup": "Knockout experience",
  "league-individual": "League influence",
  "other-individual": "Individual influence",
  "top-100": "Prestige · leadership",
};

const normalize = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll("’", "'")
    .toLocaleLowerCase();

export const classifyAccolade = (
  label: string,
  category?: PlayerAccolade["category"],
): AccoladeKind => {
  const value = normalize(label);
  if (/top 100 player/.test(value)) return "top-100";
  if (/world cup champion/.test(value)) return "world-cup-champion";
  if (/ballon d'or/.test(value)) return "ballon-dor";
  if (/world cup golden ball/.test(value)) return "world-cup-golden-ball";
  if (/world cup golden boot/.test(value)) return "world-cup-golden-boot";
  if (/world cup golden glove/.test(value)) return "world-cup-golden-glove";
  if (/champions league|copa libertadores/.test(value)) {
    return "continental-club";
  }
  if (
    /copa america|european championship|africa cup|asian cup|gold cup|nations league/.test(
      value,
    ) &&
    /champion|winner/.test(value)
  ) {
    return "continental-international";
  }
  if (category === "domestic-cup" || /domestic cup|coupe de la ligue/.test(value)) {
    return "domestic-cup";
  }
  if (
    /world cup|fifa|uefa|afc|concacaf|caf|world xi|all-star/.test(
      value,
    )
  ) {
    return "international-individual";
  }
  if (
    /player of the year|footballer of the year|player of the season|best player|mvp|golden shoe|golden ball|marston medal/.test(
      value,
    )
  ) {
    return "league-individual";
  }
  if (
    category === "domestic-league" ||
    /league champion|liga champion|lig champion|division champion|serie a champion|eredivisie champion|division 1 champion/.test(
      value,
    ) ||
    /\bchampion$/.test(value)
  ) {
    return "domestic-league";
  }
  return category === "individual"
    ? "other-individual"
    : "other-individual";
};

const displayLabel = (label: string, kind: AccoladeKind) => {
  const fixed: Partial<Record<AccoladeKind, string>> = {
    "world-cup-champion": "WORLD CUP CHAMPION",
    "ballon-dor": "BALLON D’OR",
    "world-cup-golden-ball": "WORLD CUP GOLDEN BALL",
    "world-cup-golden-boot": "WORLD CUP GOLDEN BOOT",
    "world-cup-golden-glove": "WORLD CUP GOLDEN GLOVE",
    "top-100": "TOP 100 PLAYER",
  };
  return fixed[kind] ?? label.toLocaleUpperCase();
};

const itemFromCareerAccolade = (
  accolade: PlayerAccolade,
): PlayerAccoladeItem => {
  const kind = classifyAccolade(accolade.label, accolade.category);
  return {
    id: accolade.id,
    label: displayLabel(accolade.label, kind),
    count: accolade.count,
    kind,
    priority: priorityByKind[kind],
    effectLabel: effectLabelByKind[kind],
    sourceUrl: accolade.sourceUrl,
    tournament: false,
  };
};

const itemFromTournamentAchievement = (
  achievement: TournamentAchievement,
): PlayerAccoladeItem => {
  const value = normalize(achievement.label);
  const kind =
    value === "golden ball"
      ? "world-cup-golden-ball"
      : value === "golden boot"
        ? "world-cup-golden-boot"
        : value === "golden glove"
          ? "world-cup-golden-glove"
          : classifyAccolade(achievement.label);
  return {
    id: achievement.id,
    label: displayLabel(achievement.label, kind),
    kind,
    priority: priorityByKind[kind],
    effectLabel: effectLabelByKind[kind],
    sourceUrl: achievement.source.url,
    tournament: true,
  };
};

export const getPlayerAccoladeItems = (player: PlayerTournamentCard) => {
  const career = player.careerAccolades
    .filter((accolade) => accolade.verified)
    .map(itemFromCareerAccolade);
  const tournament = player.achievements
    .filter((achievement) => Boolean(achievement.source.url))
    .map(itemFromTournamentAchievement);
  const top100: PlayerAccoladeItem[] = player.top100Player
    ? [
        {
          id: "top-100-player",
          label: "TOP 100 PLAYER",
          kind: "top-100",
          priority: priorityByKind["top-100"],
          effectLabel: effectLabelByKind["top-100"],
          sourceUrl: player.top100Source?.sourceUrl,
          tournament: false,
        },
      ]
    : [];

  const unique = new Map<string, PlayerAccoladeItem>();
  for (const item of [...career, ...tournament, ...top100]) {
    const key = `${item.kind}:${item.label}`;
    const existing = unique.get(key);
    if (
      !existing ||
      (item.count ?? 1) > (existing.count ?? 1)
    ) {
      unique.set(key, item);
    }
  }

  return [...unique.values()].sort(
    (first, second) =>
      first.priority - second.priority ||
      (second.count ?? 1) - (first.count ?? 1) ||
      first.label.localeCompare(second.label),
  );
};

const diminishingCount = (count: number) =>
  Math.min(2.65, 1 + Math.log2(Math.max(1, count)) * 0.55);

export const calculatePlayerAccoladeEffect = (
  player: PlayerTournamentCard,
): AccoladeEffect => {
  const effect = emptyEffect();
  const seen = new Set<string>();
  for (const item of getPlayerAccoladeItems(player)) {
    const key = `${item.kind}:${item.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const base = effectByKind[item.kind];
    const countFactor = diminishingCount(item.count ?? 1);
    effect.attack += base.attack * countFactor;
    effect.midfield += base.midfield * countFactor;
    effect.defense += base.defense * countFactor;
    effect.chemistry += base.chemistry * countFactor;
    effect.leadership += base.leadership * countFactor;
    effect.quality += base.quality * countFactor;
  }
  return {
    attack: Math.min(1.4, effect.attack),
    midfield: Math.min(1.4, effect.midfield),
    defense: Math.min(1.4, effect.defense),
    chemistry: Math.min(1.6, effect.chemistry),
    leadership: Math.min(2, effect.leadership),
    quality: Math.min(1.6, effect.quality),
  };
};

export const calculateSquadAccoladeEffect = (
  players: PlayerTournamentCard[],
): AccoladeEffect => {
  const total = players.reduce((sum, player) => {
    const effect = calculatePlayerAccoladeEffect(player);
    for (const key of Object.keys(sum) as Array<keyof AccoladeEffect>) {
      sum[key] += effect[key];
    }
    return sum;
  }, emptyEffect());
  return {
    attack: Math.min(1.8, total.attack * 0.3),
    midfield: Math.min(1.8, total.midfield * 0.3),
    defense: Math.min(1.8, total.defense * 0.3),
    chemistry: Math.min(3, total.chemistry * 0.34),
    leadership: Math.min(3, total.leadership * 0.35),
    quality: Math.min(1.8, total.quality * 0.3),
  };
};

export const calculatePlayerLeadership = (player: PlayerTournamentCard) => {
  const accoladeEffect = calculatePlayerAccoladeEffect(player);
  return Math.round(
    Math.min(
      99,
      Math.max(
        55,
        player.attributes.clutch * 0.55 +
          player.overall * 0.25 +
          15 +
          accoladeEffect.leadership * 4,
      ),
    ),
  );
};
