import type {
  PlayerAccolade,
  PlayerTournamentCard,
  TournamentFinish,
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
  "world-cup-champion": "Career legacy",
  "ballon-dor": "Career legacy",
  "world-cup-golden-ball": "Career legacy",
  "world-cup-golden-boot": "Career legacy",
  "world-cup-golden-glove": "Career legacy",
  "continental-international": "Career legacy",
  "continental-club": "Career legacy",
  "international-individual": "Career legacy",
  "domestic-league": "Career legacy",
  "domestic-cup": "Career legacy",
  "league-individual": "Career legacy",
  "other-individual": "Career legacy",
  "top-100": "Career legacy",
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
  if (/fifa club world cup winner/.test(value)) return "continental-club";
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

const accoladeItemsFor = (
  player: PlayerTournamentCard,
  accolades: PlayerAccolade[],
) => {
  const career = accolades
    .filter((accolade) => accolade.verified)
    .map(itemFromCareerAccolade);
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
  for (const item of [...career, ...top100]) {
    const key = `${item.kind}:${item.label}`;
    const existing = unique.get(key);
    if (!existing || (item.count ?? 1) > (existing.count ?? 1)) {
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

/**
 * The card UI uses the audited current-career list shared by every card for
 * the same player identity. Tournament-specific `achievements` remain
 * separate card data.
 */
export const getPlayerAccoladeItems = (player: PlayerTournamentCard) =>
  accoladeItemsFor(player, player.careerAccolades);

/**
 * Preserve the pre-audit identity-level inputs used by team ratings. Step 1
 * changes the accolade display data only; it must not alter gameplay ratings,
 * chemistry, or match behavior.
 */
const diminishingCount = (count: number) =>
  Math.min(2.65, 1 + Math.log2(Math.max(1, count)) * 0.55);

/**
 * Legacy is specific to this World Cup tournament card.
 *
 * It reflects what the player achieved in THIS tournament rather than inheriting
 * one career-wide score across every card version.
 */
const tournamentFinishLegacyPoints: Record<TournamentFinish, number> = {
  champion: 38,
  "runner-up": 31,
  "third place": 27,
  "fourth place": 24,
  "semi-finals": 22,
  "quarter-finals": 16,
  "round of 16": 11,
  "second group stage": 8,
  "group stage": 4,
};

const tournamentAchievementLegacyPoints = (
  label: string,
  ratingEffect: number,
) => {
  const value = normalize(label);

  if (/golden ball/.test(value)) return 21;
  if (/golden boot/.test(value)) return 17;
  if (/golden glove/.test(value)) return 17;
  if (/silver ball|silver boot|silver shoe/.test(value)) return 11;
  if (/bronze ball|bronze boot|bronze shoe/.test(value)) return 8;
  if (/best young player|young player/.test(value)) return 8;
  if (/all[- ]star|team of the tournament|best xi/.test(value)) return 6;

  return Math.max(2, Math.min(7, Math.round(ratingEffect * 18)));
};

const tournamentParticipationLegacyPoints = (
  player: PlayerTournamentCard,
) => {
  const { appearances, starts, minutes } = player.tournamentStats;

  const appearancePoints = Math.min(
    8,
    Math.max(0, appearances ?? 0) * 1.05,
  );
  const startPoints = Math.min(7, Math.max(0, starts ?? 0) * 0.9);
  const minutePoints =
    minutes === null ? 0 : Math.min(3, Math.max(0, minutes) / 240);

  return Math.min(18, appearancePoints + startPoints + minutePoints);
};

const tournamentOutputLegacyPoints = (player: PlayerTournamentCard) => {
  const stats = player.tournamentStats;

  if (player.primaryPosition === "GK") {
    const cleanSheets = Math.max(0, stats.cleanSheets ?? 0);
    const saves = Math.max(0, stats.saves ?? 0);
    const penaltiesSaved = Math.max(0, stats.penaltiesSaved ?? 0);
    const goalsConceded = Math.max(0, stats.goalsConceded ?? 0);

    return Math.max(
      0,
      Math.min(
        18,
        cleanSheets * 2.2 +
          penaltiesSaved * 3.5 +
          Math.min(7, saves * 0.16) -
          Math.min(5, goalsConceded * 0.28),
      ),
    );
  }

  const goals = Math.max(0, stats.goals ?? 0);
  const assists = Math.max(0, stats.assists ?? 0);

  return Math.min(18, goals * 2.25 + assists * 1.55);
};

const tournamentQualityLegacyPoints = (player: PlayerTournamentCard) =>
  Math.max(0, Math.min(12, (player.overall - 76) * 0.62));

export type SquadLegacy = {
  score: number;
  bonus: 0 | 1 | 2 | 3 | 4;
  contributors: Array<{
    playerIdentityId: string;
    playerName: string;
    score: number;
  }>;
};

export const calculatePlayerLegacyScore = (
  player: PlayerTournamentCard,
): number => {
  const finishPoints = player.tournamentFinish
    ? tournamentFinishLegacyPoints[player.tournamentFinish]
    : 0;

  const participationPoints = tournamentParticipationLegacyPoints(player);

  const achievementPoints = Math.min(
    24,
    player.achievements.reduce(
      (sum, achievement) =>
        sum +
        tournamentAchievementLegacyPoints(
          achievement.label,
          achievement.ratingEffect,
        ),
      0,
    ),
  );

  const outputPoints = tournamentOutputLegacyPoints(player);
  const qualityPoints = tournamentQualityLegacyPoints(player);

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        finishPoints +
          participationPoints +
          achievementPoints +
          outputPoints +
          qualityPoints,
      ),
    ),
  );
};

const legacyBonusForScore = (score: number): 0 | 1 | 2 | 3 | 4 => {
  // Legacy should reward a decorated squad without requiring fourteen
  // near-perfect career resumes. +4 remains elite, but is realistically
  // reachable by an all-time Trophy XI.
  if (score >= 85) return 4;
  if (score >= 73) return 3;
  if (score >= 60) return 2;
  if (score >= 45) return 1;
  return 0;
};

export const calculateSquadLegacy = (
  players: PlayerTournamentCard[],
): SquadLegacy => {
  // Defensive dedupe makes legacy identity-safe even if a caller accidentally
  // provides two tournament cards for the same player.
  const byIdentity = new Map<string, PlayerTournamentCard>();
  for (const player of players) {
    if (!byIdentity.has(player.playerIdentityId)) {
      byIdentity.set(player.playerIdentityId, player);
    }
  }

  const contributors = [...byIdentity.values()]
    .map((player) => ({
      playerIdentityId: player.playerIdentityId,
      playerName: player.playerName,
      score: calculatePlayerLegacyScore(player),
    }))
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.playerName.localeCompare(second.playerName),
    );

  if (contributors.length === 0) {
    return { score: 0, bonus: 0, contributors: [] };
  }

  const groups = [
    { values: contributors.slice(0, 3), weight: 0.45 },
    { values: contributors.slice(3, 7), weight: 0.35 },
    { values: contributors.slice(7, 14), weight: 0.2 },
  ].filter((group) => group.values.length > 0);

  const usedWeight = groups.reduce((sum, group) => sum + group.weight, 0);
  const score = Math.round(
    groups.reduce(
      (sum, group) =>
        sum +
        (group.values.reduce((groupSum, item) => groupSum + item.score, 0) /
          group.values.length) *
          group.weight,
      0,
    ) / usedWeight,
  );

  return {
    score,
    bonus: legacyBonusForScore(score),
    contributors,
  };
};

export const calculatePlayerAccoladeEffect = (
  _player: PlayerTournamentCard,
): AccoladeEffect => emptyEffect();

export const calculateSquadAccoladeEffect = (
  _players: PlayerTournamentCard[],
): AccoladeEffect => emptyEffect();

export const calculatePlayerLeadership = (player: PlayerTournamentCard) =>
  Math.round(
    Math.min(
      99,
      Math.max(
        55,
        player.attributes.clutch * 0.6 +
          player.overall * 0.3 +
          10,
      ),
    ),
  );
