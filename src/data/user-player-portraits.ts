import type { ImageAttribution } from "@/types/game";

const userSuppliedPortrait = ({
  id,
  subjectName,
  tournamentYear,
  sourceFile,
  representedTeam,
  isNationalTeamKit,
  cacheVersion,
  runtimeFile,
}: {
  id: string;
  subjectName: string;
  tournamentYear: number;
  sourceFile: string;
  representedTeam: string;
  isNationalTeamKit: boolean;
  cacheVersion: string;
  runtimeFile?: string;
}): ImageAttribution => ({
  id,
  kind: "player",
  subjectName,
  tournamentYear,
  file: runtimeFile ?? `/assets/players/${tournamentYear}/${id}.png`,
  cacheVersion,
  sourceFile,
  sourcePage: null,
  author: "User-supplied asset (photographer not stated)",
  license: "User-supplied for Trophy XI project use",
  licenseUrl: null,
  changes:
    runtimeFile === sourceFile
      ? "Used the supplied local transparent cutout without pixel transformation."
      : "Copied to the card-specific asset path without pixel transformation; the supplied PNG already contained a transparent cutout.",
  fallback: false,
  representedTeam,
  photographedYear: null,
  exactTournamentImage: false,
  isNationalTeamKit,
  photoContext: "other-licensed-face",
  cropFocus: { x: 50, y: 20 },
  gameEdition: null,
  gameEditionLaunchYear: null,
  sourceWebsite: "User-supplied local file",
  retrievedOn: "2026-07-19",
  matchQuality: "user-supplied-permissioned",
  requiredAttribution:
    "User-supplied player imagery used for Trophy XI; original photographer, publication source, and photograph date are not stated.",
});

export const userSuppliedPlayerImages: ImageAttribution[] = [
  userSuppliedPortrait({
    id: "bobby-moore-1970",
    subjectName: "Bobby Moore",
    tournamentYear: 1970,
    sourceFile: "/assets/players/1970/bobby-moore-1970.webp",
    runtimeFile: "/assets/players/1970/bobby-moore-1970.webp",
    representedTeam: "England",
    isNationalTeamKit: false,
    cacheVersion: "49daafeb0f699a50",
  }),
  userSuppliedPortrait({
    id: "johan-cruyff-1974",
    subjectName: "Johan Cruyff",
    tournamentYear: 1974,
    sourceFile: "/assets/players/1974/johan-cruyff-1974.webp",
    runtimeFile: "/assets/players/1974/johan-cruyff-1974.webp",
    representedTeam: "Netherlands",
    isNationalTeamKit: false,
    cacheVersion: "179766ebd529f989",
  }),
  userSuppliedPortrait({
    id: "mario-kempes-1974",
    subjectName: "Mario Kempes",
    tournamentYear: 1974,
    sourceFile: "/assets/players/1974/mario-kempes-1974.webp",
    runtimeFile: "/assets/players/1974/mario-kempes-1974.webp",
    representedTeam: "Argentina",
    isNationalTeamKit: false,
    cacheVersion: "844fb862b21d8bf3",
  }),
  userSuppliedPortrait({
    id: "lionel-messi-2006",
    subjectName: "Lionel Messi",
    tournamentYear: 2006,
    sourceFile: "/messi_2006.png",
    representedTeam: "Argentina",
    isNationalTeamKit: true,
    cacheVersion: "1f22e4d1c9abdbeb",
  }),
  userSuppliedPortrait({
    id: "lionel-messi-2010",
    subjectName: "Lionel Messi",
    tournamentYear: 2010,
    sourceFile: "/messi_2010.png",
    representedTeam: "Argentina",
    isNationalTeamKit: false,
    cacheVersion: "f4767c686ba5ae7c",
  }),
  userSuppliedPortrait({
    id: "cristiano-ronaldo-2006",
    subjectName: "Cristiano Ronaldo",
    tournamentYear: 2006,
    sourceFile: "/ronaldo_2006.png",
    representedTeam: "Portugal",
    isNationalTeamKit: false,
    cacheVersion: "d271a2a13dab8de1",
  }),
  userSuppliedPortrait({
    id: "cristiano-ronaldo-2010",
    subjectName: "Cristiano Ronaldo",
    tournamentYear: 2010,
    sourceFile: "/ronaldo_2010.png",
    representedTeam: "Portugal",
    isNationalTeamKit: true,
    cacheVersion: "77d59ac92a1a57e0",
  }),
  userSuppliedPortrait({
    id: "cristian-romero-2022",
    subjectName: "Cristian Romero",
    tournamentYear: 2022,
    sourceFile: "/assets/players/2022/cristian-romero-2023.webp",
    runtimeFile: "/assets/players/2022/cristian-romero-2023.webp",
    representedTeam: "Argentina",
    isNationalTeamKit: false,
    cacheVersion: "cbb8f8f523705280",
  }),
  userSuppliedPortrait({
    id: "dominik-livakovic-2022",
    subjectName: "Dominik Livaković",
    tournamentYear: 2022,
    sourceFile: "/assets/players/2022/dominik-livaković-2022.webp",
    runtimeFile: "/assets/players/2022/dominik-livaković-2022.webp",
    representedTeam: "Croatia",
    isNationalTeamKit: false,
    cacheVersion: "209a127e5d3a54b5",
  }),
  userSuppliedPortrait({
    id: "julian-alvarez-2022",
    subjectName: "Julián Álvarez",
    tournamentYear: 2022,
    sourceFile: "/assets/players/2022/julián-álvarez-2022.webp",
    runtimeFile: "/assets/players/2022/julián-álvarez-2022.webp",
    representedTeam: "Argentina",
    isNationalTeamKit: false,
    cacheVersion: "bc0fb06cd20ab511",
  }),
  userSuppliedPortrait({
    id: "sofyan-amrabat-2022",
    subjectName: "Sofyan Amrabat",
    tournamentYear: 2022,
    sourceFile: "/assets/players/2022/sofyan-amrabat-2022.webp",
    runtimeFile: "/assets/players/2022/sofyan-amrabat-2022.webp",
    representedTeam: "Morocco",
    isNationalTeamKit: false,
    cacheVersion: "95354f7f1ddd0386",
  }),
];
