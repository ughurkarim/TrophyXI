import { managersById } from "@/data/managers";
import {
  historicalOpponentSource,
  historicalOpponents as historicalArchive,
} from "@/data/opponents/generated";
import {
  worldCup2026Participants,
  worldCup2026ParticipantSource,
} from "@/data/opponents/participants-2026";
import type {
  FormationId,
  HistoricalLineupPlayer,
  HistoricalWorldCupTeam,
  Position,
  TournamentEra,
} from "@/types/game";

/**
 * The Fjelstul database records the final's participants and their stated
 * positions.  It does not encode a tactical diagram, so `formationLabel` is
 * deliberately kept beside the engine shape and marks an approximation when
 * the archive's historical shape is not one of Trophy XI's playable systems.
 *
 * Substitute rows are final-match entrants where three are available. Earlier
 * finals had fewer (or no) substitutions; in those cases the remaining places
 * are sourced members of that tournament squad, rather than invented bench
 * appearances.  `rosterSource` makes that distinction durable for consumers.
 */

const finalLineupSource = {
  ...historicalOpponentSource,
  label: "The Fjelstul World Cup Database v1.2.0 — final player appearances",
};

const rosterSource = {
  ...historicalOpponentSource,
  label:
    "The Fjelstul World Cup Database v1.2.0 — final appearances and tournament squads",
};

const spain2026FinalLineupSource = {
  label: "Spain 1–0 Argentina — FIFA World Cup 2026 final report",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-argentina-final-report-highlights",
  publisher: "FIFA",
  accessedOn: "2026-07-26",
};

const spain2026RosterSource = {
  label: "Spain squad announcement — FIFA World Cup 2026",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-squad-announcement-luis-de-la-fuente",
  publisher: "FIFA",
  accessedOn: "2026-07-26",
};

const positionFor = (code: string): Position => {
  const positions: Record<string, Position> = {
    GK: "GK",
    LB: "LB",
    LWB: "LWB",
    CB: "CB",
    SW: "CB",
    RB: "RB",
    RWB: "RWB",
    DM: "DM",
    CM: "CM",
    AM: "AM",
    LM: "LM",
    RM: "RM",
    LW: "LW",
    RW: "RW",
    LF: "LW",
    RF: "RW",
    CF: "CF",
    FW: "ST",
    SS: "ST",
    DF: "CB",
    MF: "CM",
  };
  const position = positions[code];
  if (!position) throw new Error(`Unsupported Fjelstul position ${code}`);
  return position;
};

const playerIdentityIdFor = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const roster = (
  rows: readonly string[],
  ratings: Readonly<Record<string, number>>,
): HistoricalLineupPlayer[] =>
  rows.map((row) => {
    const [sourcePlayerId, name, positionCode] = row.split("|");
    const position = positionFor(positionCode);
    const rating = ratings[sourcePlayerId];

    if (rating === undefined) {
      throw new Error(`Missing champion player rating for ${sourcePlayerId} (${name})`);
    }
    if (rating < 72 || rating > 99) {
      throw new Error(`Champion player rating out of bounds for ${sourcePlayerId}: ${rating}`);
    }

    return {
      playerIdentityId: playerIdentityIdFor(name),
      sourcePlayerId,
      name,
      position,
      rating,
    };
  });

type ChampionPlayerRatings = Readonly<Record<string, Readonly<Record<string, number>>>>;

/**
 * Trophy XI gameplay ratings for champion squads.
 *
 * These are deliberately tournament-specific, squad-relative estimates rather
 * than official ratings. Explicit per-player values avoid accidental ordering
 * from array position (for example Messi 2022 being rated below teammates).
 */
const championPlayerRatings: ChampionPlayerRatings = {
  "brazil-1970": {
    "P-39749": 89, // Félix
    "P-59934": 89, // Brito
    "P-02965": 90, // Piazza
    "P-25829": 95, // Carlos Alberto
    "P-14923": 92, // Clodoaldo
    "P-77430": 97, // Jairzinho
    "P-04354": 95, // Gérson
    "P-53202": 94, // Tostão
    "P-38906": 99, // Pelé
    "P-85778": 95, // Rivellino
    "P-27277": 88, // Everaldo
    "P-15663": 86, // Marco Antônio
    "P-47010": 84, // Ado
    "P-97113": 86, // Roberto
  },
  "west-germany-1974": {
    "P-14080": 94, // Sepp Maier
    "P-69695": 92, // Berti Vogts
    "P-48686": 94, // Paul Breitner
    "P-66174": 89, // Hans-Georg Schwarzenbeck
    "P-72864": 98, // Franz Beckenbauer
    "P-48733": 90, // Jürgen Grabowski
    "P-60896": 93, // Wolfgang Overath
    "P-72441": 96, // Gerd Müller
    "P-92173": 91, // Uli Hoeneß
    "P-41102": 91, // Rainer Bonhof
    "P-35602": 89, // Bernd Hölzenbein
    "P-28162": 86, // Horst-Dieter Höttges
    "P-89257": 87, // Herbert Wimmer
    "P-44313": 85, // Bernhard Cullmann
  },
  "argentina-1978": {
    "P-66254": 93, // Osvaldo Ardiles
    "P-61157": 91, // Daniel Bertoni
    "P-25276": 94, // Ubaldo Fillol
    "P-99593": 89, // Américo Gallego
    "P-03905": 88, // Luis Galván
    "P-35082": 97, // Mario Kempes
    "P-26640": 91, // Leopoldo Luque
    "P-06976": 88, // Jorge Olguín
    "P-34830": 87, // Oscar Ortiz
    "P-80376": 95, // Daniel Passarella
    "P-54098": 90, // Alberto Tarantini
    "P-04739": 87, // René Houseman
    "P-23168": 85, // Omar Larrosa
    "P-44317": 86, // Norberto Alonso
  },
  "italy-1982": {
    "P-48831": 95, // Dino Zoff
    "P-29143": 90, // Giuseppe Bergomi
    "P-03775": 92, // Antonio Cabrini
    "P-30672": 89, // Fulvio Collovati
    "P-21248": 93, // Claudio Gentile
    "P-99788": 95, // Gaetano Scirea
    "P-75736": 89, // Gabriele Oriali
    "P-93788": 94, // Marco Tardelli
    "P-66365": 93, // Bruno Conti
    "P-16875": 87, // Francesco Graziani
    "P-91717": 97, // Paolo Rossi
    "P-44349": 87, // Franco Causio
    "P-46574": 89, // Alessandro Altobelli
    "P-42920": 86, // Franco Baresi
  },
  "argentina-1986": {
    "P-22408": 89, // Sergio Batista
    "P-62815": 89, // José Luis Brown
    "P-95267": 94, // Jorge Burruchaga
    "P-22755": 87, // José Luis Cuciuffo
    "P-80404": 99, // Diego Maradona
    "P-02464": 93, // Jorge Valdano
    "P-70033": 90, // Héctor Enrique
    "P-49676": 89, // Ricardo Giusti
    "P-46907": 88, // Julio Olarticoechea
    "P-15637": 88, // Nery Pumpido
    "P-79080": 92, // Oscar Ruggeri
    "P-65092": 85, // Marcelo Trobbiani
    "P-83449": 84, // Sergio Almirón
    "P-60363": 86, // Ricardo Bochini
  },
  "west-germany-1990": {
    "P-59164": 92, // Bodo Illgner
    "P-67713": 95, // Andreas Brehme
    "P-83968": 93, // Jürgen Kohler
    "P-23204": 90, // Klaus Augenthaler
    "P-51921": 91, // Guido Buchwald
    "P-89975": 91, // Pierre Littbarski
    "P-77552": 90, // Thomas Häßler
    "P-04572": 93, // Rudi Völler
    "P-49502": 98, // Lothar Matthäus
    "P-59388": 88, // Thomas Berthold
    "P-91373": 94, // Jürgen Klinsmann
    "P-74629": 87, // Stefan Reuter
    "P-03526": 84, // Frank Mill
    "P-70770": 83, // Raimond Aumann
  },
  "brazil-1994": {
    "P-31850": 93, // Cláudio Taffarel
    "P-26340": 90, // Jorginho
    "P-12551": 92, // Mauro Silva
    "P-90842": 90, // Branco
    "P-68671": 94, // Bebeto
    "P-32466": 92, // Dunga
    "P-12418": 87, // Zinho
    "P-61251": 98, // Romário
    "P-56505": 91, // Aldair
    "P-07679": 89, // Márcio Santos
    "P-78793": 88, // Mazinho
    "P-91718": 88, // Cafu
    "P-81097": 85, // Viola
    "P-61247": 84, // Ricardo Rocha
  },
  "france-1998": {
    "P-56735": 92, // Bixente Lizarazu
    "P-80680": 91, // Youri Djorkaeff
    "P-61954": 93, // Didier Deschamps
    "P-79380": 94, // Marcel Desailly
    "P-26820": 85, // Stéphane Guivarc'h
    "P-56430": 97, // Zinedine Zidane
    "P-56947": 96, // Lilian Thuram
    "P-55991": 93, // Fabien Barthez
    "P-40400": 92, // Emmanuel Petit
    "P-19907": 88, // Frank Leboeuf
    "P-28482": 89, // Christian Karembeu
    "P-96540": 89, // Patrick Vieira
    "P-10738": 86, // Alain Boghossian
    "P-74065": 87, // Christophe Dugarry
  },
  "brazil-2002": {
    "P-64377": 91, // Marcos
    "P-91718": 94, // Cafu
    "P-42918": 92, // Lúcio
    "P-66308": 87, // Roque Júnior
    "P-09270": 90, // Edmílson
    "P-85176": 94, // Roberto Carlos
    "P-45956": 91, // Gilberto Silva
    "P-62722": 99, // Ronaldo
    "P-74261": 97, // Rivaldo
    "P-57361": 95, // Ronaldinho
    "P-79283": 89, // Kléberson
    "P-79146": 88, // Denílson
    "P-20389": 87, // Juninho Paulista
    "P-57975": 85, // Ricardinho
  },
  "italy-2006": {
    "P-11392": 97, // Gianluigi Buffon
    "P-99473": 92, // Fabio Grosso
    "P-88863": 98, // Fabio Cannavaro
    "P-18164": 92, // Gennaro Gattuso
    "P-96512": 88, // Luca Toni
    "P-42038": 92, // Francesco Totti
    "P-22378": 89, // Mauro Camoranesi
    "P-42227": 94, // Gianluca Zambrotta
    "P-57529": 88, // Simone Perrotta
    "P-99537": 95, // Andrea Pirlo
    "P-37126": 91, // Marco Materazzi
    "P-65802": 89, // Daniele De Rossi
    "P-83836": 91, // Alessandro Del Piero
    "P-38599": 86, // Vincenzo Iaquinta
  },
  "spain-2010": {
    "P-61793": 96, // Iker Casillas
    "P-64348": 92, // Gerard Piqué
    "P-51089": 94, // Carles Puyol
    "P-56330": 96, // Andrés Iniesta
    "P-49097": 95, // David Villa
    "P-29415": 97, // Xavi
    "P-47753": 88, // Joan Capdevila
    "P-73924": 92, // Xabi Alonso
    "P-89177": 93, // Sergio Ramos
    "P-28010": 93, // Sergio Busquets
    "P-78418": 89, // Pedro
    "P-71661": 88, // Fernando Torres
    "P-81297": 91, // Cesc Fàbregas
    "P-69284": 88, // Jesús Navas
  },
  "germany-2014": {
    "P-19408": 97, // Manuel Neuer
    "P-54036": 88, // Benedikt Höwedes
    "P-81447": 93, // Mats Hummels
    "P-43400": 94, // Bastian Schweinsteiger
    "P-12818": 91, // Mesut Özil
    "P-27787": 90, // Miroslav Klose
    "P-28154": 95, // Thomas Müller
    "P-18599": 95, // Philipp Lahm
    "P-39356": 94, // Toni Kroos
    "P-04224": 92, // Jérôme Boateng
    "P-42177": 85, // Christoph Kramer
    "P-46979": 92, // André Schürrle
    "P-02328": 87, // Per Mertesacker
    "P-63673": 91, // Mario Götze
  },
  "france-2018": {
    "P-30711": 92, // Hugo Lloris
    "P-60652": 90, // Benjamin Pavard
    "P-42326": 94, // Raphaël Varane
    "P-67297": 92, // Samuel Umtiti
    "P-17509": 93, // Paul Pogba
    "P-90908": 96, // Antoine Griezmann
    "P-89750": 88, // Olivier Giroud
    "P-64077": 95, // Kylian Mbappé
    "P-98287": 95, // N'Golo Kanté
    "P-04964": 89, // Blaise Matuidi
    "P-84424": 91, // Lucas Hernandez
    "P-54461": 88, // Corentin Tolisso
    "P-69451": 87, // Steven Nzonzi
    "P-20754": 86, // Nabil Fekir
  },
  "argentina-2022": {
    "P-35173": 88, // Nicolás Tagliafico
    "P-37314": 90, // Rodrigo De Paul
    "P-19776": 93, // Julián Álvarez
    "P-14758": 99, // Lionel Messi
    "P-42113": 94, // Ángel Di María
    "P-79650": 91, // Cristian Romero
    "P-49114": 90, // Nicolás Otamendi
    "P-71343": 91, // Alexis Mac Allister
    "P-13162": 95, // Emiliano Martínez
    "P-10739": 92, // Enzo Fernández
    "P-84430": 89, // Nahuel Molina
    "P-91431": 88, // Gonzalo Montiel
    "P-27582": 88, // Leandro Paredes
    "P-29298": 86, // Germán Pezzella
    "P-73712": 89, // Marcos Acuña
    "P-28151": 87, // Paulo Dybala
    "P-81505": 87, // Lautaro Martínez
  },
  "spain-2026": {
    "ESP26-01": 91, // Unai Simón
    "ESP26-02": 89, // Pedro Porro
    "ESP26-03": 89, // Robin Le Normand
    "ESP26-04": 92, // Pau Cubarsí
    "ESP26-05": 91, // Marc Cucurella
    "ESP26-06": 96, // Rodri
    "ESP26-07": 95, // Pedri
    "ESP26-08": 93, // Dani Olmo
    "ESP26-09": 98, // Lamine Yamal
    "ESP26-10": 90, // Mikel Oyarzabal
    "ESP26-11": 94, // Nico Williams
    "ESP26-12": 93, // Fabián Ruiz
    "ESP26-13": 92, // Gavi
    "ESP26-14": 88, // Ferran Torres
  },
};

type ChampionDefinition = {
  id: string;
  managerCardId: string;
  formation: FormationId;
  formationLabel: string;
  engineFormationIsApproximation: boolean;
  tacticalProfile: string;
  era: TournamentEra;
  championFact: string;
  championFactUrl: string;
  starters: readonly string[];
  substitutes: readonly string[];
};

const champions: readonly ChampionDefinition[] = [
  {
    id: "brazil-1970",
    managerCardId: "mario-zagallo-1970",
    formation: "4-2-2-2",
    formationLabel: "4–2–4",
    engineFormationIsApproximation: true,
    tacticalProfile: "Fluid attacking interchange around Pelé, with fullbacks supplying a fifth forward lane.",
    era: "1970s",
    championFact: "Won every match and permanently claimed the Jules Rimet Trophy.",
    championFactUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/brazil-team-profile-history",
    starters: ["P-39749|Félix|GK", "P-59934|Brito|DF", "P-02965|Piazza|DF", "P-25829|Carlos Alberto|DF", "P-14923|Clodoaldo|MF", "P-77430|Jairzinho|RW", "P-04354|Gérson|MF", "P-53202|Tostão|FW", "P-38906|Pelé|FW", "P-85778|Rivellino|LW", "P-27277|Everaldo|DF"],
    substitutes: ["P-15663|Marco Antônio|DF", "P-47010|Ado|GK", "P-97113|Roberto|FW"],
  },
  {
    id: "west-germany-1974",
    managerCardId: "helmut-schon-1974",
    formation: "4-3-3",
    formationLabel: "4–3–3",
    engineFormationIsApproximation: false,
    tacticalProfile: "Sweeper-led authority, technical width, and controlled central progression.",
    era: "1970s",
    championFact: "Came from behind to defeat the Netherlands in the final.",
    championFactUrl: "https://collect.fifa.com/marketplace/pn-c2-27",
    starters: ["P-14080|Sepp Maier|GK", "P-69695|Berti Vogts|RB", "P-48686|Paul Breitner|LB", "P-66174|Hans-Georg Schwarzenbeck|CB", "P-72864|Franz Beckenbauer|CB", "P-48733|Jürgen Grabowski|RW", "P-60896|Wolfgang Overath|CM", "P-72441|Gerd Müller|CF", "P-92173|Uli Hoeneß|AM", "P-41102|Rainer Bonhof|CM", "P-35602|Bernd Hölzenbein|LW"],
    substitutes: ["P-28162|Horst-Dieter Höttges|DF", "P-89257|Herbert Wimmer|MF", "P-44313|Bernhard Cullmann|MF"],
  },
  {
    id: "argentina-1978",
    managerCardId: "cesar-luis-menotti-1978",
    formation: "4-3-3",
    formationLabel: "4–3–3",
    engineFormationIsApproximation: false,
    tacticalProfile: "Expansive possession with decisive wide service into Kempes and Luque.",
    era: "1970s",
    championFact: "Captured its first World Cup title as the host nation.",
    championFactUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/articles/argentina-1978-champions-stats-statistics",
    starters: ["P-66254|Osvaldo Ardiles|CM", "P-61157|Daniel Bertoni|RW", "P-25276|Ubaldo Fillol|GK", "P-99593|Américo Gallego|DM", "P-03905|Luis Galván|CB", "P-35082|Mario Kempes|AM", "P-26640|Leopoldo Luque|CF", "P-06976|Jorge Olguín|RB", "P-34830|Oscar Ortiz|LW", "P-80376|Daniel Passarella|CB", "P-54098|Alberto Tarantini|LB"],
    substitutes: ["P-04739|René Houseman|MF", "P-23168|Omar Larrosa|MF", "P-44317|Norberto Alonso|MF"],
  },
  {
    id: "italy-1982",
    managerCardId: "enzo-bearzot-1982",
    formation: "5-3-2",
    formationLabel: "5–3–2",
    engineFormationIsApproximation: false,
    tacticalProfile: "Defensive trust, wingback balance, and sharp knockout transitions around Rossi.",
    era: "1980s",
    championFact: "Paolo Rossi scored six goals and won the Golden Boot.",
    championFactUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/articles/paolo-rossi-italy-golden-boot-1982",
    starters: ["P-48831|Dino Zoff|GK", "P-29143|Giuseppe Bergomi|RWB", "P-03775|Antonio Cabrini|LWB", "P-30672|Fulvio Collovati|CB", "P-21248|Claudio Gentile|CB", "P-99788|Gaetano Scirea|SW", "P-75736|Gabriele Oriali|DM", "P-93788|Marco Tardelli|CM", "P-66365|Bruno Conti|RM", "P-16875|Francesco Graziani|LW", "P-91717|Paolo Rossi|CF"],
    substitutes: ["P-44349|Franco Causio|MF", "P-46574|Alessandro Altobelli|FW", "P-42920|Franco Baresi|DF"],
  },
  {
    id: "argentina-1986",
    managerCardId: "carlos-bilardo-1986",
    formation: "3-5-2",
    formationLabel: "3–5–2",
    engineFormationIsApproximation: false,
    tacticalProfile: "Compact pragmatism built around Maradona's free creative role and two-wingback release.",
    era: "1980s",
    championFact: "Maradona inspired one of the tournament’s most celebrated individual campaigns.",
    championFactUrl: "https://www.fifa.com/es/articles/el-partido-perfecto-de-maradona-contra-inglaterra-en-mexico-1986",
    starters: ["P-22408|Sergio Batista|DM", "P-62815|José Luis Brown|SW", "P-95267|Jorge Burruchaga|AM", "P-22755|José Luis Cuciuffo|CB", "P-80404|Diego Maradona|SS", "P-02464|Jorge Valdano|CF", "P-70033|Héctor Enrique|CM", "P-49676|Ricardo Giusti|RWB", "P-46907|Julio Olarticoechea|LWB", "P-15637|Nery Pumpido|GK", "P-79080|Oscar Ruggeri|CB"],
    substitutes: ["P-65092|Marcelo Trobbiani|MF", "P-83449|Sergio Almirón|FW", "P-60363|Ricardo Bochini|MF"],
  },
  {
    id: "west-germany-1990",
    managerCardId: "franz-beckenbauer-1990",
    formation: "3-5-2",
    formationLabel: "3–5–2",
    engineFormationIsApproximation: false,
    tacticalProfile: "Flexible control through Matthäus, supported by disciplined wingbacks and two forwards.",
    era: "1990s",
    championFact: "Won a third title in a final rematch against Argentina.",
    championFactUrl: "https://www.fifa.com/de/tournaments/mens/worldcup/articles/wm-titel-deutschland-ueberblick-ergebnisse-torschuetzen-kader",
    starters: ["P-59164|Bodo Illgner|GK", "P-67713|Andreas Brehme|LWB", "P-83968|Jürgen Kohler|CB", "P-23204|Klaus Augenthaler|SW", "P-51921|Guido Buchwald|CB", "P-89975|Pierre Littbarski|CM", "P-77552|Thomas Häßler|CM", "P-04572|Rudi Völler|CF", "P-49502|Lothar Matthäus|CM", "P-59388|Thomas Berthold|RWB", "P-91373|Jürgen Klinsmann|CF"],
    substitutes: ["P-74629|Stefan Reuter|DF", "P-03526|Frank Mill|FW", "P-70770|Raimond Aumann|GK"],
  },
  {
    id: "brazil-1994",
    managerCardId: "carlos-alberto-parreira-1994",
    formation: "4-4-2",
    formationLabel: "4–4–2",
    engineFormationIsApproximation: false,
    tacticalProfile: "Compact midfield protection for Bebeto and Romário, with fullback support timed selectively.",
    era: "1990s",
    championFact: "Ended a 24-year title wait in the first World Cup final decided by penalties.",
    championFactUrl: "https://www.fifa.com/pt/articles/copa-mundo-1994-brasil-italia-final",
    starters: ["P-31850|Cláudio Taffarel|GK", "P-26340|Jorginho|RB", "P-12551|Mauro Silva|CM", "P-90842|Branco|LB", "P-68671|Bebeto|CF", "P-32466|Dunga|CM", "P-12418|Zinho|AM", "P-61251|Romário|CF", "P-56505|Aldair|CB", "P-07679|Márcio Santos|CB", "P-78793|Mazinho|AM"],
    substitutes: ["P-91718|Cafu|DF", "P-81097|Viola|FW", "P-61247|Ricardo Rocha|DF"],
  },
  {
    id: "france-1998",
    managerCardId: "aime-jacquet-1998",
    formation: "4-2-3-1",
    formationLabel: "4–3–2–1",
    engineFormationIsApproximation: true,
    tacticalProfile: "Midfield power and defensive balance, freeing Zidane and Djorkaeff between the lines.",
    era: "1990s",
    championFact: "Won its first World Cup while playing on home soil.",
    championFactUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/articles/france-1998-winners-champions-stats-statistics",
    starters: ["P-56735|Bixente Lizarazu|LB", "P-80680|Youri Djorkaeff|AM", "P-61954|Didier Deschamps|DM", "P-79380|Marcel Desailly|CB", "P-26820|Stéphane Guivarc'h|CF", "P-56430|Zinedine Zidane|AM", "P-56947|Lilian Thuram|RB", "P-55991|Fabien Barthez|GK", "P-40400|Emmanuel Petit|CM", "P-19907|Frank Leboeuf|CB", "P-28482|Christian Karembeu|CM"],
    substitutes: ["P-96540|Patrick Vieira|MF", "P-10738|Alain Boghossian|MF", "P-74065|Christophe Dugarry|FW"],
  },
  {
    id: "brazil-2002",
    managerCardId: "luiz-felipe-scolari-2002",
    formation: "3-4-2-1",
    formationLabel: "3–4–2–1",
    engineFormationIsApproximation: false,
    tacticalProfile: "Wing-midfield width and a hardened three behind Ronaldo, Rivaldo, and Ronaldinho.",
    era: "2000s",
    championFact: "Won all seven matches on the way to a fifth title.",
    championFactUrl: "https://www.fifa.com/en/articles/brazil-26-world-cup-records",
    starters: ["P-64377|Marcos|GK", "P-91718|Cafu|RM", "P-42918|Lúcio|CB", "P-66308|Roque Júnior|CB", "P-09270|Edmílson|CB", "P-85176|Roberto Carlos|LM", "P-45956|Gilberto Silva|CM", "P-62722|Ronaldo|CF", "P-74261|Rivaldo|CF", "P-57361|Ronaldinho|AM", "P-79283|Kléberson|CM"],
    substitutes: ["P-79146|Denílson|MF", "P-20389|Juninho Paulista|MF", "P-57975|Ricardinho|MF"],
  },
  {
    id: "italy-2006",
    managerCardId: "marcello-lippi-2006",
    formation: "4-2-3-1",
    formationLabel: "4–2–3–1",
    engineFormationIsApproximation: false,
    tacticalProfile: "Elite defensive organization with flexible attacking rotations behind a central striker.",
    era: "2000s",
    championFact: "Allowed only two goals during the entire tournament.",
    championFactUrl: "https://www.fifa.com/it/tournaments/mens/worldcup/articles/germania-italia-semifinale-2006",
    starters: ["P-11392|Gianluigi Buffon|GK", "P-99473|Fabio Grosso|LB", "P-88863|Fabio Cannavaro|CB", "P-18164|Gennaro Gattuso|CM", "P-96512|Luca Toni|CF", "P-42038|Francesco Totti|AM", "P-22378|Mauro Camoranesi|RM", "P-42227|Gianluca Zambrotta|RB", "P-57529|Simone Perrotta|LM", "P-99537|Andrea Pirlo|CM", "P-37126|Marco Materazzi|CB"],
    substitutes: ["P-65802|Daniele De Rossi|MF", "P-83836|Alessandro Del Piero|FW", "P-38599|Vincenzo Iaquinta|FW"],
  },
  {
    id: "spain-2010",
    managerCardId: "vicente-del-bosque-2010",
    formation: "4-2-3-1",
    formationLabel: "4–2–3–1",
    engineFormationIsApproximation: false,
    tacticalProfile: "Supreme ball control, patient positional circulation, and a protected central creator.",
    era: "2010s",
    championFact: "The first champion to recover from losing its opening match.",
    championFactUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-qualify-2026",
    starters: ["P-61793|Iker Casillas|GK", "P-64348|Gerard Piqué|CB", "P-51089|Carles Puyol|CB", "P-56330|Andrés Iniesta|RW", "P-49097|David Villa|CF", "P-29415|Xavi|AM", "P-47753|Joan Capdevila|LB", "P-73924|Xabi Alonso|DM", "P-89177|Sergio Ramos|RB", "P-28010|Sergio Busquets|DM", "P-78418|Pedro|LW"],
    substitutes: ["P-71661|Fernando Torres|FW", "P-81297|Cesc Fàbregas|MF", "P-69284|Jesús Navas|MF"],
  },
  {
    id: "germany-2014",
    managerCardId: "joachim-low-2014",
    formation: "4-3-3",
    formationLabel: "4–3–3",
    engineFormationIsApproximation: false,
    tacticalProfile: "Technical control with ruthless positional flexibility and aggressive counterpressing.",
    era: "2010s",
    championFact: "The first European nation to win a World Cup in the Americas.",
    championFactUrl: "https://inside.fifa.com/tournaments/mens/worldcup/2014brazil/news/germans-reign-as-brazil-thrills-the-world-2404806",
    starters: ["P-19408|Manuel Neuer|GK", "P-54036|Benedikt Höwedes|LB", "P-81447|Mats Hummels|CB", "P-43400|Bastian Schweinsteiger|CM", "P-12818|Mesut Özil|LF", "P-27787|Miroslav Klose|CF", "P-28154|Thomas Müller|RF", "P-18599|Philipp Lahm|RB", "P-39356|Toni Kroos|LM", "P-04224|Jérôme Boateng|CB", "P-42177|Christoph Kramer|RM"],
    substitutes: ["P-46979|André Schürrle|FW", "P-02328|Per Mertesacker|DF", "P-63673|Mario Götze|MF"],
  },
  {
    id: "france-2018",
    managerCardId: "didier-deschamps-2018",
    formation: "4-2-3-1",
    formationLabel: "4–2–3–1",
    engineFormationIsApproximation: false,
    tacticalProfile: "Controlled space, midfield coverage, and devastating transition speed around Mbappé.",
    era: "2010s",
    championFact: "Mbappé became the second teenager to score in a World Cup final.",
    championFactUrl: "https://www.fifa.com/en/archive/kylian-mbappe",
    starters: ["P-30711|Hugo Lloris|GK", "P-60652|Benjamin Pavard|RB", "P-42326|Raphaël Varane|CB", "P-67297|Samuel Umtiti|CB", "P-17509|Paul Pogba|CM", "P-90908|Antoine Griezmann|AM", "P-89750|Olivier Giroud|CF", "P-64077|Kylian Mbappé|RW", "P-98287|N'Golo Kanté|CM", "P-04964|Blaise Matuidi|LW", "P-84424|Lucas Hernandez|LB"],
    substitutes: ["P-54461|Corentin Tolisso|MF", "P-69451|Steven Nzonzi|MF", "P-20754|Nabil Fekir|FW"],
  },
  {
    id: "argentina-2022",
    managerCardId: "lionel-scaloni-2022",
    formation: "4-3-3",
    formationLabel: "4–3–3",
    engineFormationIsApproximation: false,
    tacticalProfile: "Collective intensity and flexible support around Messi, with aggressive wide defensive coverage.",
    era: "2020s",
    championFact: "Recovered from an opening defeat to become world champions.",
    championFactUrl: "https://www.fifa.com/es/articles/el-camino-de-argentina-hacia-el-titulo-de-la-copa-mundial",
    starters: ["P-35173|Nicolás Tagliafico|LB", "P-37314|Rodrigo De Paul|CM", "P-19776|Julián Álvarez|CF", "P-14758|Lionel Messi|RF", "P-42113|Ángel Di María|LF", "P-79650|Cristian Romero|CB", "P-49114|Nicolás Otamendi|CB", "P-71343|Alexis Mac Allister|CM", "P-13162|Emiliano Martínez|GK", "P-10739|Enzo Fernández|DM", "P-84430|Nahuel Molina|RB"],
    substitutes: ["P-91431|Gonzalo Montiel|DF", "P-27582|Leandro Paredes|MF", "P-29298|Germán Pezzella|DF", "P-73712|Marcos Acuña|MF", "P-28151|Paulo Dybala|FW", "P-81505|Lautaro Martínez|FW"],
  },
];

const archiveById = new Map(historicalArchive.map((team) => [team.id, team]));

const spain2026Participant = worldCup2026Participants.find(
  (team) => team.id === "spain-2026",
);

if (!spain2026Participant) {
  throw new Error("Spain 2026 participant record is unavailable");
}

const spain2026Champion: HistoricalWorldCupTeam = {
  ...spain2026Participant,
  tournamentFinish: "champion",
  tournamentStatus: "complete",
  dataStatus: "verified-lineup",
  managerName: "Luis de la Fuente",
  managerIdentityId: "luis-de-la-fuente",
  managerCardId: "luis-de-la-fuente-2026",
  formation: "4-3-3",
  formationLabel: "4–3–3",
  alternateFormations: ["4-2-3-1"],
  startingLineup: roster(
    [
      "ESP26-01|Unai Simón|GK",
      "ESP26-02|Pedro Porro|RB",
      "ESP26-03|Robin Le Normand|CB",
      "ESP26-04|Pau Cubarsí|CB",
      "ESP26-05|Marc Cucurella|LB",
      "ESP26-06|Rodri|DM",
      "ESP26-07|Pedri|CM",
      "ESP26-08|Dani Olmo|AM",
      "ESP26-09|Lamine Yamal|RW",
      "ESP26-10|Mikel Oyarzabal|CF",
      "ESP26-11|Nico Williams|LW",
    ],
    championPlayerRatings["spain-2026"],
  ),
  substitutes: roster(
    [
      "ESP26-12|Fabián Ruiz|CM",
      "ESP26-13|Gavi|CM",
      "ESP26-14|Ferran Torres|FW",
    ],
    championPlayerRatings["spain-2026"],
  ),
  tacticalProfile:
    "Relentless positional control, fearless wing isolation, and coordinated pressure led by Yamal's right-sided creativity.",
  ratings: {
    attack: 94,
    midfield: 95,
    defense: 91,
    goalkeeper: 88,
    depth: 92,
    overall: 93,
  },
  championFact:
    "Lamine Yamal helped Spain win seven straight matches as La Roja claimed its second men's World Cup.",
  championFactSource: spain2026FinalLineupSource,
  sources: [
    worldCup2026ParticipantSource,
    spain2026FinalLineupSource,
    spain2026RosterSource,
  ],
  finalLineupSource: spain2026FinalLineupSource,
  rosterSource: spain2026RosterSource,
  era: "2020s",
  originalRatings: true,
  formationIsModel: true,
  difficulty: "Legendary",
};

export const championOpponents: HistoricalWorldCupTeam[] = [
  spain2026Champion,
  ...champions.map((definition) => {
    const archiveTeam = archiveById.get(definition.id);
    const manager = managersById.get(definition.managerCardId);
    if (!archiveTeam || !manager) {
      throw new Error(`Incomplete champion definition: ${definition.id}`);
    }
    if (!championPlayerRatings[definition.id]) {
      throw new Error(`Missing champion player ratings: ${definition.id}`);
    }
    return {
      ...archiveTeam,
      kind: "historical" as const,
      dataStatus: "verified-lineup" as const,
      managerName: manager.managerName,
      managerIdentityId: manager.managerIdentityId,
      managerCardId: manager.id,
      formation: definition.formation,
      formationLabel: definition.formationLabel,
      engineFormationIsApproximation: definition.engineFormationIsApproximation,
      alternateFormations: manager.acceptableFormations.filter(
        (formation) => formation !== definition.formation,
      ),
      startingLineup: roster(
        definition.starters,
        championPlayerRatings[definition.id],
      ),
      substitutes: roster(
        definition.substitutes,
        championPlayerRatings[definition.id],
      ),
      tacticalProfile: definition.tacticalProfile,
      sources: [historicalOpponentSource, finalLineupSource, rosterSource],
      finalLineupSource,
      rosterSource,
      championFact: definition.championFact,
      championFactSource: {
        label: `${archiveTeam.nationName} ${archiveTeam.tournamentYear} champion fact`,
        url: definition.championFactUrl,
        publisher: "FIFA",
        accessedOn: "2026-07-18",
      },
      era: definition.era,
      formationIsModel: definition.engineFormationIsApproximation,
    };
  }),
]
  .sort((first, second) => (second.tournamentYear ?? 0) - (first.tournamentYear ?? 0));

if (championOpponents.length !== 15) {
  throw new Error("Champion roster layer must contain exactly 15 teams");
}
