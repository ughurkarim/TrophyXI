import { managers } from "@/data/managers";
import type { ImageAttribution } from "@/types/game";

type ManagerPortraitSeed = {
  identityId: string;
  sourceFile: string;
  cacheVersion: string;
};

/**
 * One local portrait per manager identity. Source imports remain untouched;
 * runtime code uses only stable ASCII filenames served by the flat route.
 */
const portraitSeeds: ManagerPortraitSeed[] = [
  { identityId: "alf-ramsey", sourceFile: "alf-ramsey.png", cacheVersion: "f9ad3b70f244dbbb" },
  { identityId: "helmut-schon", sourceFile: "Helmut Schön.png", cacheVersion: "fcf61a20d30ae43c" },
  { identityId: "mario-zagallo", sourceFile: "zagallo.png", cacheVersion: "3acaa5c534fe9b17" },
  { identityId: "enzo-bearzot", sourceFile: "Enzo Bearzot.png", cacheVersion: "9e5ec975cae9daab" },
  { identityId: "ernst-happel", sourceFile: "Ernst Happel.png", cacheVersion: "5cea54baecc276c6" },
  { identityId: "tele-santana", sourceFile: "Telê Santana.png", cacheVersion: "8c0dcefb7a998b91" },
  { identityId: "guus-hiddink", sourceFile: "guus-hiddink-2002.png", cacheVersion: "193d8b0eb0d10a29" },
  { identityId: "marcelo-bielsa", sourceFile: "Marcelo Bielsa .png", cacheVersion: "0937e839468e13d7" },
  { identityId: "marcello-lippi", sourceFile: "Marcello Lippi.png", cacheVersion: "6445d7f432526d37" },
  { identityId: "jurgen-klinsmann", sourceFile: "jurgen-klinsmann-2006.png", cacheVersion: "11fb4e4fa24369f9" },
  { identityId: "raymond-domenech", sourceFile: "Raymond Domenech.png", cacheVersion: "63cf8a13941f1cfa" },
  { identityId: "jose-pekerman", sourceFile: "José Pékerman.png", cacheVersion: "6d63d0e8a0462b2e" },
  { identityId: "vicente-del-bosque", sourceFile: "Vicente del Bosque.webp", cacheVersion: "3ebc44516be36a80" },
  { identityId: "joachim-low", sourceFile: "joachim-low-2014.png", cacheVersion: "912b69baafddac78" },
  { identityId: "louis-van-gaal", sourceFile: "louis-van-gaal-2014.png", cacheVersion: "43596ec0fc3ea18e" },
  { identityId: "didier-deschamps", sourceFile: "didier-deschamps-2018.png", cacheVersion: "e29aa6d8c6244990" },
  { identityId: "zlatko-dalic", sourceFile: "zlatko-dalic-2018.png", cacheVersion: "aa33e3f907ad7f3c" },
  { identityId: "tite", sourceFile: "tite-2022.png", cacheVersion: "ee908aad84e001c3" },
  { identityId: "lionel-scaloni", sourceFile: "lionel-scaloni-2022.png", cacheVersion: "9540e3331dcb5b46" },
  { identityId: "walid-regragui", sourceFile: "walid-regragui.png", cacheVersion: "c442ebf8089b8d81" },
  { identityId: "jupp-derwall", sourceFile: "Jupp Derwall.png", cacheVersion: "f0a1d8b944526b5a" },
  { identityId: "senol-gunes", sourceFile: "Şenol Güneş.webp", cacheVersion: "eda6b12f18a466d1" },
  { identityId: "bert-van-marwijk", sourceFile: "Bert_van_Marwijk.1.webp", cacheVersion: "e208abe7b440b010" },
  { identityId: "roberto-martinez", sourceFile: "Roberto Martínez.jpeg", cacheVersion: "02d71d2c2a6c5372" },
  { identityId: "gareth-southgate", sourceFile: "Gareth Southgate.webp", cacheVersion: "9feabbfe574089f4" },
  { identityId: "luis-de-la-fuente", sourceFile: "Luis de la Fuente.png", cacheVersion: "e505aa27ca1267cd" },
  { identityId: "carlo-ancelotti", sourceFile: "Carlo_Ancelotti.webp", cacheVersion: "b9424f5b6320d1a9" },
  { identityId: "thomas-tuchel", sourceFile: "tuchel.png", cacheVersion: "0ef2bf4cc4ab4692" },
{ identityId: "aime-jacquet", sourceFile: "aime-jacquet.png", cacheVersion: "10f5cb17d66810b2" },
{ identityId: "carlos-alberto-parreira", sourceFile: "carlos-alberto-parreira.png", cacheVersion: "ca7aad30c2544048" },
{ identityId: "cesar-luis-menotti", sourceFile: "cesar-luis-menotti.png", cacheVersion: "b307a06dc0ef4c65" },
{ identityId: "alejandro-sabella", sourceFile: "alejandro-sabella.png", cacheVersion: "49f4ea38a3a95522" },
{ identityId: "bruno-metsu", sourceFile: "bruno-metsu.png", cacheVersion: "da8f873c88567035" },
{ identityId: "luiz-felipe-scolari", sourceFile: "luiz-felipe-scolari.png", cacheVersion: "9e69f62eaa0df4da" },
{ identityId: "franz-beckenbauer", sourceFile: "franz-beckenbauer.png", cacheVersion: "3745a3f9b88effd2" },
{ identityId: "kazimierz-gorski", sourceFile: "kazimierz-gorski.png", cacheVersion: "4da170190b01bb39" },
{ identityId: "rinus-michels", sourceFile: "rinus-michels.png", cacheVersion: "ef65a2817d990b3f" },
{ identityId: "guy-thys", sourceFile: "guy-thys.png", cacheVersion: "301d7c4dc8fc99c0" },
{ identityId: "oscar-tabarez", sourceFile: "oscar-tabarez.png", cacheVersion: "5f0c64a9df326ac1" },
{ identityId: "michel-hidalgo", sourceFile: "michel-hidalgo.png", cacheVersion: "5a6a5ce1a5d9618d" },
{ identityId: "rudi-voller", sourceFile: "rudi-voller.png", cacheVersion: "609f65cbe3980f04" },
{ identityId: "herve-renard", sourceFile: "herve-renard.png", cacheVersion: "cca43bc4edd2486d" },
{ identityId: "azeglio-vicini", sourceFile: "azeglio-vicini.png", cacheVersion: "0a3c0f265c315485" },
{ identityId: "bobby-robson", sourceFile: "bobby-robson.png", cacheVersion: "ab6f0590f03da9a9" },
{ identityId: "arrigo-sacchi", sourceFile: "arrigo-sacchi.png", cacheVersion: "eb561eb7f71bb109" },
{ identityId: "tommy-svensson", sourceFile: "tommy-svensson.png", cacheVersion: "3ed80b7590a6fdfb" },
{ identityId: "carlos-bilardo", sourceFile: "carlos-bilardo.png", cacheVersion: "cd6f27cf39c4c8fa" },
];

const managerByIdentity = new Map(
  managers.map((manager) => [manager.managerIdentityId, manager]),
);

export const licensedManagerPortraitImages: ImageAttribution[] =
  portraitSeeds.map(({ identityId, sourceFile, cacheVersion }) => {
    const manager = managerByIdentity.get(identityId);
    if (!manager) {
      throw new Error(`${identityId}: manager portrait requires a manager identity`);
    }

    return {
      id: identityId,
      kind: "manager",
      subjectName: manager.managerName,
      tournamentYear: manager.tournamentYear,
      file: `/assets/managers/${identityId}.png`,
      cacheVersion,
      sourceFile: `assets/managers/${sourceFile}`,
      sourcePage: null,
      author: "Project asset collection",
      license: "User-supplied project asset",
      licenseUrl: null,
      changes:
        identityId === "roberto-martinez"
          ? "Background isolated and exported as a transparent PNG; identity preserved."
          : "Mechanically normalized to a stable transparent PNG; identity preserved.",
      fallback: false,
      representedTeam: manager.teamName,
      photographedYear: null,
      exactTournamentImage: false,
      isNationalTeamKit: false,
      photoContext: "other-licensed-face",
      cropFocus: { x: 50, y: 24 },
      gameEdition: null,
      gameEditionLaunchYear: null,
      sourceWebsite: "Local project assets",
      retrievedOn: "2026-07-21",
      matchQuality: "user-supplied-permissioned",
      requiredAttribution: "",
    };
  });

if (
  new Set(licensedManagerPortraitImages.map((image) => image.id)).size !==
  licensedManagerPortraitImages.length
) {
  throw new Error("Manager portrait manifest must contain one image per identity");
}
