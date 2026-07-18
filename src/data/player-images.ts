import { managers } from "@/data/managers";
import { players } from "@/data/players";
import type { ImageAttribution } from "@/types/game";

const fallbackAttribution = (
  id: string,
  kind: ImageAttribution["kind"],
  subjectName: string,
  tournamentYear: number,
): ImageAttribution => ({
  id,
  kind,
  subjectName,
  tournamentYear,
  file:
    kind === "player"
      ? `/players/png/${id}.png`
      : `/managers/png/${id}.png`,
  sourceFile: null,
  sourcePage: null,
  author: "Trophy XI",
  license: "Original project artwork",
  licenseUrl: null,
  changes: "Purpose-built transparent illustrated tournament fallback; 700×900 master.",
  fallback: true,
  representedTeam: null,
  photographedYear: null,
  exactTournamentImage: false,
  isNationalTeamKit: false,
  cropFocus: { x: 50, y: 36 },
});

const licensedOverrides: Record<string, ImageAttribution> = {
  "ivan-perisic-2018": {
    id: "ivan-perisic-2018",
    kind: "player",
    subjectName: "Ivan Perišić",
    tournamentYear: 2018,
    file: "/players/png/ivan-perisic-2018.png",
    sourceFile: "/players/sources/ivan-perisic-2018.jpg",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Ivan_Peri%C5%A1i%C4%87.jpg",
    author: "Антон Зайцев",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    changes:
      "Background isolated with a reviewed chroma-key derivative, edge-contracted, cropped, and resized to a transparent 700×900 master.",
    fallback: false,
    representedTeam: "Croatia",
    photographedYear: 2018,
    exactTournamentImage: true,
    isNationalTeamKit: true,
    cropFocus: { x: 50, y: 34 },
  },
  "kylian-mbappe-2018": {
    id: "kylian-mbappe-2018",
    kind: "player",
    subjectName: "Kylian Mbappé",
    tournamentYear: 2018,
    file: "/players/png/kylian-mbappe-2018.png",
    sourceFile: "/players/sources/kylian-mbappe-2018.jpg",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Kylian_Mbapp%C3%A9_2018.jpg",
    author: "Антон Зайцев",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    changes:
      "Background isolated with a reviewed chroma-key derivative, edge-contracted, cropped, and resized to a transparent 700×900 master.",
    fallback: false,
    representedTeam: "France",
    photographedYear: 2018,
    exactTournamentImage: true,
    isNationalTeamKit: true,
    cropFocus: { x: 50, y: 31 },
  },
  "luka-modric-2018": {
    id: "luka-modric-2018",
    kind: "player",
    subjectName: "Luka Modrić",
    tournamentYear: 2018,
    file: "/players/png/luka-modric-2018.png",
    sourceFile: "/players/sources/luka-modric-2018.png",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Luka_Modric_2018.png",
    author: "Антон Зайцев",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    changes:
      "Background isolated with a reviewed chroma-key derivative, edge-contracted, cropped, and resized to a transparent 700×900 master.",
    fallback: false,
    representedTeam: "Croatia",
    photographedYear: 2018,
    exactTournamentImage: true,
    isNationalTeamKit: true,
    cropFocus: { x: 50, y: 34 },
  },
  "thibaut-courtois-2018": {
    id: "thibaut-courtois-2018",
    kind: "player",
    subjectName: "Thibaut Courtois",
    tournamentYear: 2018,
    file: "/players/png/thibaut-courtois-2018.png",
    sourceFile: "/players/sources/thibaut-courtois-2018.jpg",
    sourcePage:
      "https://commons.wikimedia.org/wiki/File:Courtois_2018_(cropped).jpg",
    author: "Кирилл Венедиктов",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    changes:
      "Background isolated with a reviewed chroma-key derivative, edge-contracted, cropped, and resized to a transparent 700×900 master.",
    fallback: false,
    representedTeam: "Belgium",
    photographedYear: 2018,
    exactTournamentImage: true,
    isNationalTeamKit: true,
    cropFocus: { x: 50, y: 30 },
  },
};

// Licensed photographs can replace any fallback by changing only this manifest
// entry and rerunning scripts/import-player-images.ts. The importer rejects
// incomplete source, author, license, and derivative metadata.
export const playerImages: ImageAttribution[] = players.map(
  (player) =>
    licensedOverrides[player.imageId] ??
    fallbackAttribution(
      player.imageId,
      "player",
      player.playerName,
      player.tournamentYear,
    ),
);

export const managerImages: ImageAttribution[] = managers.map((manager) =>
  fallbackAttribution(
    manager.imageId,
    "manager",
    manager.managerName,
    manager.tournamentYear,
  ),
);

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(imageAttributions.map((image) => [image.id, image]));
