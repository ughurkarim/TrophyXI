/**
 * Player eligibility comes from the typed archive. Portrait availability is
 * deliberately independent: only exact card-year files in the game-face
 * manifest render, and every missing file receives Photo Pending.
 */
export const licensedPlayerPortraitCardIds = [] as const;

/** @deprecated Player photographs never control draft eligibility. */
export const draftEligiblePlayerCardIds = licensedPlayerPortraitCardIds;

export const draftEligibleManagerCardIds = [
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
