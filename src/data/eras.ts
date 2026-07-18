import type {
  DraftEra,
  DraftEraId,
  PlayerTournamentCard,
  TournamentEra,
} from "@/types/game";

export const draftEras: DraftEra[] = [
  {
    id: "all",
    label: "All Eras",
    years: "1998—2022",
    yearRange: [1998, 2022],
    description: "The complete archive: every tournament generation can answer the call.",
    accent: "The Grand Archive",
    themeClass: "era-theme--all",
  },
  {
    id: "turn-of-century",
    label: "Turn of the Century",
    years: "1998—2006",
    yearRange: [1998, 2006],
    description: "Classic playmakers, great number nines, and uncompromising defenders.",
    accent: "Gilded Theatre",
    themeClass: "era-theme--century",
  },
  {
    id: "modern-masters",
    label: "Modern Masters",
    years: "2010—2018",
    yearRange: [2010, 2018],
    description: "Positional control, elite pressing, and devastating transition football.",
    accent: "Midnight Masters",
    themeClass: "era-theme--modern",
  },
  {
    id: "new-generation",
    label: "New Generation",
    years: "2022",
    yearRange: [2022, 2022],
    description: "Hybrid roles, fearless young stars, and the newest tournament icons.",
    accent: "Crown of Tomorrow",
    themeClass: "era-theme--new",
  },
];

export const getDraftEra = (id: DraftEraId) =>
  draftEras.find((era) => era.id === id) ?? draftEras[0];

export const isPlayerInDraftEra = (
  player: PlayerTournamentCard,
  eraId: DraftEraId,
) => {
  if (eraId === "all") return true;
  const era = getDraftEra(eraId);
  return player.tournamentYear >= era.yearRange[0] && player.tournamentYear <= era.yearRange[1];
};

export const tournamentEraFor = (year: number): TournamentEra => {
  if (year < 2000) return "1990s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
};

export const calculateEraFit = (
  player: PlayerTournamentCard,
  eraId: DraftEraId,
) => {
  if (eraId === "all") return 100;
  const era = getDraftEra(eraId);
  if (isPlayerInDraftEra(player, eraId)) return 100;
  const distance = Math.min(
    Math.abs(player.tournamentYear - era.yearRange[0]),
    Math.abs(player.tournamentYear - era.yearRange[1]),
  );
  return Math.max(65, 96 - distance * 2);
};
