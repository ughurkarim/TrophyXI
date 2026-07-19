/**
 * Player eligibility comes from the typed archive. Portrait availability is
 * deliberately independent: only card-specific files in the reviewed image
 * manifests render, and every missing file receives Photo Pending.
 */
export const licensedPlayerPortraitCardIds = [] as const;

/** @deprecated Player face availability never controls draft eligibility. */
export const draftEligiblePlayerCardIds = licensedPlayerPortraitCardIds;

export const draftEligibleManagerCardIds = [
  "alf-ramsey-1970",
  "helmut-schon-1970",
  "mario-zagallo-1970",
  "kazimierz-gorski-1974",
  "rinus-michels-1974",
  "helmut-schon-1974",
  "enzo-bearzot-1978",
  "ernst-happel-1978",
  "cesar-luis-menotti-1978",
  "enzo-bearzot-1982",
  "tele-santana-1982",
  "michel-hidalgo-1982",
  "carlos-bilardo-1986",
  "franz-beckenbauer-1986",
  "guy-thys-1986",
  "franz-beckenbauer-1990",
  "bobby-robson-1990",
  "azeglio-vicini-1990",
  "carlos-alberto-parreira-1994",
  "arrigo-sacchi-1994",
  "tommy-svensson-1994",
  "aime-jacquet-1998",
  "mario-zagallo-1998",
  "guus-hiddink-1998",
  "guus-hiddink-2002",
  "luiz-felipe-scolari-2002",
  "luiz-felipe-scolari-2006",
  "rudi-voller-2002",
  "bruno-metsu-2002",
  "marcelo-bielsa-2002",
  "marcello-lippi-2006",
  "jurgen-klinsmann-2006",
  "raymond-domenech-2006",
  "jose-pekerman-2006",
  "vicente-del-bosque-2010",
  "vicente-del-bosque-2014",
  "joachim-low-2010",
  "joachim-low-2014",
  "oscar-tabarez-2010",
  "alejandro-sabella-2014",
  "louis-van-gaal-2014",
  "didier-deschamps-2018",
  "didier-deschamps-2022",
  "zlatko-dalic-2018",
  "zlatko-dalic-2022",
  "herve-renard-2022",
  "tite-2022",
  "lionel-scaloni-2022",
  "walid-regragui-2022",
] as const;

export const draftEligibleManagerIdSet = new Set<string>(
  draftEligibleManagerCardIds,
);
