import generatedSourcesJson from "../../scripts/licensed-portrait-sources.generated.json";
import { draftEligibleManagers } from "@/data/managers";
import { players } from "@/data/players";
import type { ImageAttribution } from "@/types/game";

type GeneratedSource = {
  id: string;
  kind: "player" | "manager";
  subjectName: string;
  tournamentYear: number;
  fileName: string;
  downloadUrl: string;
  sourcePage: string;
  author: string;
  license: string;
  licenseUrl: string;
  photographedYear: number | null;
  representedTeam: null;
  photoContext: "other-licensed-face";
  cropFocus: { x: number; y: number };
  changes: string;
};

const generatedSources = generatedSourcesJson as GeneratedSource[];
const generatedOverrides = new Map<string, ImageAttribution>(
  generatedSources.map((source) => {
    const directory = source.kind === "player" ? "players" : "managers";
    const extension = source.fileName.toLowerCase().endsWith(".png")
      ? "png"
      : "jpg";
    return [
      source.id,
      {
        id: source.id,
        kind: source.kind,
        subjectName: source.subjectName,
        tournamentYear: source.tournamentYear,
        file: `/${directory}/png/${source.id}.png`,
        sourceFile: `/${directory}/sources/${source.id}.${extension}`,
        sourcePage: source.sourcePage,
        author: source.author,
        license: source.license,
        licenseUrl: source.licenseUrl,
        changes: source.changes,
        fallback: false,
        representedTeam: source.representedTeam,
        photographedYear: source.photographedYear,
        exactTournamentImage: false,
        isNationalTeamKit: false,
        photoContext: source.photoContext,
        cropFocus: source.cropFocus,
      },
    ];
  }),
);

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
    photoContext: "exact-tournament",
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
    photoContext: "exact-tournament",
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
    photoContext: "exact-tournament",
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
    photoContext: "exact-tournament",
    cropFocus: { x: 50, y: 30 },
  },
};

const attributionFor = (id: string) =>
  licensedOverrides[id] ?? generatedOverrides.get(id);

export const playerImages: ImageAttribution[] = players.flatMap((player) => {
  const attribution = attributionFor(player.imageId);
  return attribution ? [attribution] : [];
});

export const managerImages: ImageAttribution[] = draftEligibleManagers.map(
  (manager) => {
    const attribution = attributionFor(manager.imageId);
    if (!attribution) {
      throw new Error(`Missing licensed active-manager portrait ${manager.id}`);
    }
    return attribution;
  },
);

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(imageAttributions.map((image) => [image.id, image]));

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);
