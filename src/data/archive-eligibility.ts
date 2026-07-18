/**
 * The public archive is broader than the playable draft pool. A record becomes
 * draft eligible only after its portrait and attribution have passed the
 * licensed-photo audit. Inactive records remain available to historical models
 * and research tooling; they are never offered as playable cards.
 */
export const draftEligiblePlayerCardIds = [
  "manuel-neuer-2014",
  "paolo-maldini-1994",
  "fabio-cannavaro-2006",
  "franz-beckenbauer-1974",
  "cafu-2002",
  "lothar-matthaus-1990",
  "xavi-2010",
  "zinedine-zidane-1998",
  "kylian-mbappe-2022",
  "ronaldo-2002",
  "lionel-messi-2022",
  "pele-1970",
  "diego-maradona-1986",
  "philipp-lahm-2014",
  "ivan-perisic-2018",
  "kylian-mbappe-2018",
  "luka-modric-2018",
  "thibaut-courtois-2018",
  "emiliano-martinez-2022",
  "yassine-bounou-2022",
  "dominik-livakovic-2022",
  "achraf-hakimi-2022",
  "josko-gvardiol-2022",
  "lucas-hernandez-2018",
  "sime-vrsaljko-2018",
  "kieran-trippier-2018",
  "marcos-acuna-2022",
  "denzel-dumfries-2022",
  "ngolo-kante-2018",
  "paul-pogba-2018",
  "kevin-de-bruyne-2018",
  "enzo-fernandez-2022",
  "alexis-mac-allister-2022",
  "tyler-adams-2022",
  "dele-alli-2018",
  "harry-kane-2018",
  "antoine-griezmann-2018",
  "cristiano-ronaldo-2006",
  "neymar-2014",
  "son-heung-min-2022",
  "olivier-giroud-2022",
  "ritsu-doan-2022",
  "breel-embolo-2022",
  "julian-alvarez-2022",
  "richarlison-2022",
  "romelu-lukaku-2018",
  "raphael-varane-2018",
  "carles-puyol-2010",
  "sergio-ramos-2010",
  "andres-iniesta-2010",
  "bastian-schweinsteiger-2014",
] as const;

export const draftEligibleManagerCardIds = [
  "guus-hiddink-2002",
  "jurgen-klinsmann-2006",
  "joachim-low-2014",
  "louis-van-gaal-2014",
  "didier-deschamps-2018",
  "zlatko-dalic-2018",
  "herve-renard-2022",
  "tite-2022",
  "lionel-scaloni-2022",
  "walid-regragui-2022",
] as const;

export const draftEligiblePlayerIdSet = new Set<string>(
  draftEligiblePlayerCardIds,
);
export const draftEligibleManagerIdSet = new Set<string>(
  draftEligibleManagerCardIds,
);
