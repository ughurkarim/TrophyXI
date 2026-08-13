import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const setPath = (object, dottedPath, value) => {
  const parts = dottedPath.split(".");
  const final = parts.pop();
  let cursor = object;
  for (const part of parts) cursor = cursor[part] ??= {};
  cursor[final] = value;
};

const flatten = (object, prefix = "", output = new Map()) => {
  for (const [key, value] of Object.entries(object)) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, pathName, output);
    else output.set(pathName, value);
  }
  return output;
};

const placeholderPattern = /\{\s*([A-Za-z_À-ÿ][A-Za-z0-9_À-ÿ]*)\s*(?=,|\})/g;
const english = JSON.parse(fs.readFileSync(path.join(root, "messages", "en.json"), "utf8"));
const englishFlat = flatten(english);

const manualMessages = {
  es: {
    "gameSetup.manager.styleFootball": "Fútbol de estilo {style}",
    "players.accolades.viewFullAria": "Ver todos los logros de {player} en su ficha completa",
    "matches.environmentManager": "Entorno {era} · {manager}",
    "opponents.managerProfileAria": "Perfil del entrenador {manager}",
    "opponents.ratingsAria": "Valoraciones de {country}",
    "opponents.selectChampionAria": "Seleccionar {country} {year}, dificultad {difficulty}",
    "opponents.startingXiAria": "Once inicial de {country} {year}",
    "matchReveal.dossierAria": "Informe de partido de {country}",
    "matchReveal.startingElevenAria": "Once inicial de {team}",
    "matchReveal.formationAria": "Formación {formation} de {team}",
    "matchTimeline.shootout.detail": "{player} se acerca al punto de penalti. {result}. Tanda: {user}–{opponent}. {suddenDeath}",
    "results.stats.rowAria": "{label}: Trophy XI {user}, {opponent} {opponentValue}",
    "results.page.shareSummary": "Trophy XI {user}–{opponent} {opponentName}: consulta los equipos y revive el partido.",
    "results.page.substitutionDetail": "{coach} recurre al banquillo para renovar el sistema.",
    "results.page.scoreAria": "Marcador final: Trophy XI {user}, {opponent} {opponentScore}",
    "results.page.tacticalSummary": "{identity}. Diseñado para el entorno {era}.",
    "champions.pending": "PENDIENTE",
    "worldCupRun.remaining": "QUEDAN {count}",
    "worldCupRun.shootout.opponentWins": "{opponent} GANA EN LOS PENALTIS",
    "worldCupRun.shootout.kick": "LANZAMIENTO {order} · {team}",
    "worldCupRun.header.group": "CAMINO AL MUNDIAL · GRUPO {group}",
    "worldCupRun.status.groupPosition": "{rank} EN EL GRUPO",
    "worldCupRun.loss.group": "Trophy XI terminó {rank} en el Grupo {group}. Tu plantilla y el historial del torneo siguen guardados.",
    "worldCupRun.loss.penalties": "Trophy XI cae {user}–{opponent} en los penaltis. Tu plantilla y el historial del torneo siguen guardados.",
    "worldCupRun.group.matchday": "JORNADA {number}",
    "worldCupRun.group.label": "GRUPO {group}",
    "worldCupRun.group.matchCount": "{count} PARTIDOS DE GRUPO",
    "worldCupRun.group.standings": "GRUPO {group} · CLASIFICACIÓN",
    "worldCupRun.group.fixtures": "GRUPO {group} · PARTIDOS",
    "worldCupRun.knockout.stageMatch": "PARTIDO DE {stage}",
    "worldCupRun.knockout.penaltiesWonAria": "Victoria {user}–{opponent} en los penaltis",
    "worldCupRun.knockout.penaltiesLostAria": "Derrota {user}–{opponent} en los penaltis",
    "worldCupRun.bracket.matchCount": "{count, plural, one {# PARTIDO} other {# PARTIDOS}}",
    "worldCupRun.bracket.winnerFeeder": "Ganador {stage} P{match}",
    "worldCupRun.bracket.qualifiedTeam": "Equipo clasificado {number}",
    "worldCupRun.bracket.matchUpcoming": "PARTIDO {number} · PRÓXIMO",
    "worldCupRun.bracket.matchFullTime": "PARTIDO {number} · FINALIZADO",
    "worldCupRun.bracket.match": "PARTIDO {number}",
    "worldCupRun.championLifts": "{champion} levanta el trofeo.",
    "matchTimeline.event.shootoutKick": "TANDA DE PENALTIS · LANZAMIENTO {order}",
    "sharedGame.scoreAria": "Marcador final: Trophy XI {user}, {opponent} {opponentScore}",
  },
  "pt-BR": {
    "gameSetup.formation.tendenciesAria": "Tendências do {formation}",
    "matches.environmentManager": "Ambiente {era} · {manager}",
    "opponents.managerProfileAria": "Perfil do técnico {manager}",
    "opponents.ratingsAria": "Classificações de {country}",
    "opponents.selectChampionAria": "Selecionar {country} {year}, dificuldade {difficulty}",
    "opponents.viewLineupAria": "Ver escalação de {country} {year}",
    "opponents.startingXiAria": "Onze inicial de {country} {year}",
    "opponents.substitutesAria": "Reservas disponíveis de {country} {year}",
    "matchReveal.dossierAria": "Dossiê da partida de {country}",
    "matchReveal.startingElevenAria": "Onze inicial de {team}",
  },
  ar: {
    "matches.environmentManager": "بيئة {era} · {manager}",
  },
  fr: {
    "matches.environmentManager": "Environnement {era} · {manager}",
    "draft.announcements.playerSelected": "{player} {year} sélectionné. {count, plural, one {# poste reste libre} other {# postes restent libres}}.",
    "draft.resetDescription": "Votre environnement reste inchangé. Votre entraîneur, votre formation, tous vos {count, plural, one {# choix d’équipe} other {# choix d’équipe}}, ainsi que vos relances seront réinitialisés.",
    "freeSelection.starterRolesRemain": "{count, plural, one {# poste de titulaire reste à pourvoir} other {# postes de titulaire restent à pourvoir}}",
    "freeSelection.benchPlacesRemain": "{count, plural, one {# place de remplaçant reste à pourvoir} other {# places de remplaçant restent à pourvoir}}",
    "worldCupRun.bracket.matchCount": "{count, plural, one {# MATCH} other {# MATCHS}}",
    "draft.benchNumber": "BANC {number}",
    "draft.benchSpin": "TIRAGE DU BANC / 05 · TOUR {round}",
    "draft.archiveSpin": "TIRAGE DES ARCHIVES / 05 · TOUR {round}",
    "players.managerCard.styleTactics": "TACTIQUE {style}",
    "results.stats.rowAria": "{label} : Trophy XI {user}, {opponent} {opponentValue}",
    "landing.finalChallenge.championsCount": "{count} CHAMPIONS DU MONDE",
    "opponents.championCount": "{count} CHAMPIONS",
    "worldCupRun.header.group": "PARCOURS MONDIAL · GROUPE {group}",
    "worldCupRun.groups": "GROUPES",
    "worldCupRun.group.matchday": "JOURNÉE {number}",
    "worldCupRun.group.label": "GROUPE {group}",
    "worldCupRun.knockout.stageMatch": "MATCH DE {stage}",
    "matchTimeline.finalWhistle": "COUP DE SIFFLET FINAL",
    "engineering.position.eyebrow": "02 · POSTE",
    "engineering.position.rawXi": "XI BRUT",
  },
  de: {
    "draft.announcements.playerSelected": "{player} {year} ausgewählt. {count, plural, one {# Position ist noch frei} other {# Positionen sind noch frei}}.",
    "draft.resetDescription": "Deine Umgebung bleibt bestehen. Trainer, Formation, alle {count, plural, one {# Kaderwahl} other {# Kaderwahlen}} und sämtliche Neuversuche werden zurückgesetzt.",
    "freeSelection.starterRolesRemain": "{count, plural, one {# Startposition ist noch frei} other {# Startpositionen sind noch frei}}",
    "freeSelection.benchPlacesRemain": "{count, plural, one {# Bankplatz ist noch frei} other {# Bankplätze sind noch frei}}",
    "worldCupRun.bracket.matchCount": "{count, plural, one {# SPIEL} other {# SPIELE}}",
    "gameSetup.era.chooseOptionAria": "{era}, {years} wählen",
    "gameSetup.manager.step": "TRAINER / 02",
    "gameSetup.manager.respin": "TRAINER NEU ZIEHEN ×1",
    "gameSetup.manager.formationRespin": "FORMATION NEU ZIEHEN ×1",
    "gameSetup.manager.playerRespins": "SPIELER NEU ZIEHEN ×{count}",
    "gameSetup.manager.chooseManagerAria": "{name}, {country} {year} wählen, bevorzugte Formationen {formations}, Ära-Passung {fit}",
    "gameSetup.manager.styleFootball": "Fußballstil {style}",
    "gameSetup.formation.step": "FORMATION / 03",
    "gameSetup.formation.respin": "FORMATION NEU ZIEHEN ×1",
    "gameSetup.formation.chooseAria": "Formation {formation} wählen, Trainer-Passung {managerFit}, Ära-Passung {eraFit}",
    "gameSetup.formation.tendenciesAria": "Tendenzen der Formation {formation}",
    "dialogs.respin.manager.eyebrow": "TRAINER NEU ZIEHEN ×1",
    "dialogs.respin.formation.eyebrow": "FORMATION NEU ZIEHEN ×1",
    "draft.playerPreview.placementPenalty": "Positionsabzug −{value}%",
    "draft.playerPreview.eraImpact": "Ära-Effekt −{value}%",
    "players.card.draftAria": "{player} {year} mit Wertung {rating} auswählen",
    "players.accolades.moreCompact": "+{count} WEITERE",
    "players.accolades.viewFullAria": "Alle Erfolge von {player} im vollständigen Spielerprofil ansehen",
    "players.accolades.showMore": "{count} WEITERE ANZEIGEN",
    "players.details.tierAria": "Stufe {tier}, Gesamtwertung {rating}",
    "players.details.openVersionAria": "Karte {player} {year} mit Wertung {rating} öffnen",
    "players.database.nation": "Nation",
    "players.database.ratingValue": "Wertung {rating}",
    "players.database.activeFilterCount": "{count, plural, one {# aktiver Filter} other {# aktive Filter}}",
    "players.database.removeFilter": "Filter {filter} entfernen",
    "players.database.cardsFound": "{count, plural, one {# Karte gefunden} other {# Karten gefunden}}",
    "players.database.showing": "{visible} von {total} angezeigt",
    "players.database.viewCardAria": "{player} {year} mit Wertung {rating} ansehen",
    "results.stats.rowAria": "{label}: Trophy XI {user}, {opponent} {opponentValue}",
    "matches.environmentManager": "Umgebung {era} · {manager}",
    "freeSelection.viewProfileAria": "Profil von {player} {year} ansehen",
    "opponents.championCount": "{count} WELTMEISTER",
    "opponents.managerProfileAria": "Trainerprofil von {manager}",
    "opponents.teamCount": "{count} Teams",
    "opponents.ratingsAria": "Wertungen von {country}",
    "opponents.selectChampionAria": "{country} {year}, Schwierigkeit {difficulty} wählen",
    "opponents.viewLineupAria": "Aufstellung von {country} {year} ansehen",
    "opponents.startingXiAria": "Startelf von {country} {year}",
    "opponents.substitutesAria": "Verfügbare Ersatzspieler von {country} {year}",
    "worldCupRun.shootout.kick": "SCHUSS {order} · {team}",
    "worldCupRun.header.group": "WM-LAUF · GRUPPE {group}",
    "worldCupRun.status.groupPosition": "{rank} IN DER GRUPPE",
    "worldCupRun.group.label": "GRUPPE {group}",
    "worldCupRun.group.standings": "GRUPPE {group} · TABELLE",
    "worldCupRun.group.fixtures": "GRUPPE {group} · SPIELE",
    "matchReveal.yourXiEra": "DEINE XI · {era}",
    "matchReveal.worldChampionYear": "WELTMEISTER · {year}",
    "matchReveal.dossierAria": "Spieldossier von {country}",
    "matchReveal.eraFitValue": "Ära-Passung {value}",
    "matchReveal.startingElevenAria": "Startelf von {team}",
    "matchReveal.formationAria": "Formation {formation} von {team}",
    "matchTimeline.worldChampionYear": "WELTMEISTER · {year}",
    "matchTimeline.extraTimeProgressAria": "Reguläre Spielzeit beendet. Verlängerung zu {percent} Prozent",
    "matchTimeline.progressAria": "Spielfortschritt {percent} Prozent",
    "matchTimeline.shootout.detail": "{player} tritt zum Elfmeter an. {result}. Elfmeterschießen: {user}–{opponent}. {suddenDeath}",
    "matchTimeline.event.shootoutKick": "ELFMETERSCHIESSEN · SCHUSS {order}",
    "matchTimeline.liveAnnouncement": "{minute}. {title}. {detail} Spielstand {user} zu {opponent}.",
    "engineering.position.eyebrow": "02 · POSITION",
    "engineering.position.rawXi": "ROHE XI",
    "engineering.manager.eyebrow": "04 · TRAINER",
  },
  it: {
    "draft.announcements.playerSelected": "{player} {year} selezionato. {count, plural, one {# posizione disponibile} other {# posizioni disponibili}}.",
    "players.accolades.showMore": "MOSTRA ALTRI {count}",
    "players.database.activeFilterCount": "{count, plural, one {# filtro attivo} other {# filtri attivi}}",
    "players.database.cardsFound": "{count, plural, one {# carta trovata} other {# carte trovate}}",
    "worldCupRun.bracket.matchCount": "{count, plural, one {# PARTITA} other {# PARTITE}}",
    "navigation.database": "Archivio giocatori",
    "draft.benchNumber": "PANCHINA {number}",
    "draft.benchSpin": "GIRO PANCHINA / 05 · TURNO {round}",
    "draft.archiveSpin": "GIRO ARCHIVIO / 05 · TURNO {round}",
    "draft.bench.number": "Panchina {number}",
    "results.stats.rowAria": "{label}: Trophy XI {user}, {opponent} {opponentValue}",
    "worldCupRun.remaining": "{count} RIMANENTI",
    "worldCupRun.group.matchday": "GIORNATA {number}",
    "worldCupRun.group.label": "GRUPPO {group}",
    "matchTimeline.engineLive": "MOTORE DELLA PARTITA ATTIVO",
    "privacy.eyebrow": "Privacy di Trophy XI",
    "privacy.title": "Privacy.",
  },
};

const repairs = {
  en: {
    metadata: { defaultTitle: "Trophy XI — Build the XI. Beat history.", description: "Draft legendary tournament performances and challenge the greatest World Cup champions in history.", openGraphDescription: "Draft fourteen tournament players. Choose a historical World Cup opponent. Rewrite history.", twitterDescription: "Build the XI. Beat history." },
    openGraph: { history: "History", finalRecord: "FINAL RECORD", openMatch: "OPEN THE MATCH · SEE THE TEAMS · RELIVE THE TIMELINE" },
    common: { dismissNotice: "Dismiss notice" },
    manager: { offenseShort: "OFF", defenseShort: "DEF", leadershipShort: "LEAD", gameManagementShort: "GAME" },
    result: { attackShort: "ATK", midfieldShort: "MID", defenseShort: "DEF", chemistryShort: "CHEM", overallShort: "OVR", positionShort: "POS", eraShort: "ERA", managerShort: "MGR" },
    database: { overallShort: "OVR" }, free: { overallShort: "OVR" }, worldCup: { overallShort: "OVR" },
    teamRatings: { aria: "Team ratings", attackShort: "ATK", midfieldShort: "MID", defenseShort: "DEF", chemistryShort: "CHEM", overallShort: "OVR", cohesion: "COHESION", manager: "MANAGER", balance: "BALANCE", era: "ERA", squadLegacy: "SQUAD LEGACY", legacyTiers: { immortal: "IMMORTAL", legendary: "LEGENDARY", decorated: "DECORATED", established: "ESTABLISHED", building: "BUILDING" }, overallBoost: "OVR BOOST", legacyAria: "Squad Legacy {score} out of 100, overall boost plus {bonus}", legacyFactors: "Tournaments · Awards · Career honors", chemistry: "CHEMISTRY", chemistryStates: { elite: "ELITE", strong: "STRONG", balanced: "BALANCED", developing: "DEVELOPING", disconnected: "DISCONNECTED" }, factorAria: "{label}: {value} out of 100" },
    reveal: { allStarsLogo: "All Stars logo", crestAria: "{team} crest", startingXi: "STARTING XI" },
    shared: { allStars: "All Stars", overallShort: "OVR" },
  },
  es: {
    metadata: { defaultTitle: "Trophy XI — Construye el XI. Vence a la historia.", description: "Elige actuaciones legendarias de los Mundiales y desafía a los mayores campeones de la historia.", openGraphDescription: "Elige catorce jugadores de torneo. Enfréntate a un campeón histórico del mundo. Reescribe la historia.", twitterDescription: "Construye el XI. Vence a la historia." },
    openGraph: { history: "Historia", finalRecord: "REGISTRO FINAL", openMatch: "ABRE EL PARTIDO · MIRA LOS EQUIPOS · REVIVE LA CRONOLOGÍA" },
    common: { dismissNotice: "Descartar aviso" },
    manager: { offenseShort: "ATA", defenseShort: "DEF", leadershipShort: "LID", gameManagementShort: "PART" },
    result: { attackShort: "ATA", midfieldShort: "MED", defenseShort: "DEF", chemistryShort: "QUÍM", overallShort: "VAL", positionShort: "POS", eraShort: "ERA", managerShort: "DT" },
    database: { overallShort: "VAL" }, free: { overallShort: "VAL" }, worldCup: { overallShort: "VAL" },
    teamRatings: { aria: "Valoraciones del equipo", attackShort: "ATA", midfieldShort: "MED", defenseShort: "DEF", chemistryShort: "QUÍM", overallShort: "VAL", cohesion: "COHESIÓN", manager: "ENTRENADOR", balance: "EQUILIBRIO", era: "ERA", squadLegacy: "LEGADO DEL EQUIPO", legacyTiers: { immortal: "INMORTAL", legendary: "LEGENDARIO", decorated: "LAUREADO", established: "CONSOLIDADO", building: "EN PROGRESO" }, overallBoost: "MEJORA GENERAL", legacyAria: "Legado del equipo: {score} de 100; mejora general más {bonus}", legacyFactors: "Torneos · Premios · Honores de carrera", chemistry: "QUÍMICA", chemistryStates: { elite: "ÉLITE", strong: "FUERTE", balanced: "EQUILIBRADA", developing: "EN DESARROLLO", disconnected: "DESCONECTADA" }, factorAria: "{label}: {value} de 100" },
    reveal: { allStarsLogo: "Escudo de las Estrellas", crestAria: "Escudo de {team}", startingXi: "ONCE INICIAL" },
    shared: { allStars: "Estrellas", overallShort: "VAL" },
  },
  "pt-BR": {
    metadata: { defaultTitle: "Trophy XI — Monte o XI. Supere a história.", description: "Escolha atuações lendárias em torneios e desafie os maiores campeões mundiais da história.", openGraphDescription: "Escolha catorze jogadores de torneio. Enfrente um campeão mundial histórico. Reescreva a história.", twitterDescription: "Monte o XI. Supere a história." },
    openGraph: { history: "História", finalRecord: "REGISTRO FINAL", openMatch: "ABRA A PARTIDA · VEJA AS EQUIPES · REVIVA A LINHA DO TEMPO" },
    common: { dismissNotice: "Dispensar aviso" },
    manager: { offenseShort: "ATA", defenseShort: "DEF", leadershipShort: "LID", gameManagementShort: "JOGO" },
    result: { attackShort: "ATA", midfieldShort: "MEI", defenseShort: "DEF", chemistryShort: "ENT", overallShort: "GER", positionShort: "POS", eraShort: "ERA", managerShort: "TEC" },
    database: { overallShort: "GER" }, free: { overallShort: "GER" }, worldCup: { overallShort: "GER" },
    teamRatings: { aria: "Avaliações da equipe", attackShort: "ATA", midfieldShort: "MEI", defenseShort: "DEF", chemistryShort: "ENT", overallShort: "GER", cohesion: "COESÃO", manager: "TÉCNICO", balance: "EQUILÍBRIO", era: "ERA", squadLegacy: "LEGADO DO ELENCO", legacyTiers: { immortal: "IMORTAL", legendary: "LENDÁRIO", decorated: "VITORIOSO", established: "CONSOLIDADO", building: "EM CONSTRUÇÃO" }, overallBoost: "BÔNUS GERAL", legacyAria: "Legado do elenco: {score} de 100; bônus geral mais {bonus}", legacyFactors: "Torneios · Prêmios · Títulos da carreira", chemistry: "ENTROSAMENTO", chemistryStates: { elite: "ELITE", strong: "FORTE", balanced: "EQUILIBRADO", developing: "EM EVOLUÇÃO", disconnected: "DESCONECTADO" }, factorAria: "{label}: {value} de 100" },
    reveal: { allStarsLogo: "Escudo das Estrelas", crestAria: "Escudo de {team}", startingXi: "ONZE INICIAL" },
    shared: { allStars: "Estrelas", overallShort: "GER" },
  },
  ar: {
    metadata: { defaultTitle: "Trophy XI — ابنِ التشكيلة. وتحدَّ التاريخ.", description: "اختر نسخًا أسطورية من بطولات كأس العالم وتحدَّ أعظم الأبطال عبر التاريخ.", openGraphDescription: "اختر أربعة عشر لاعبًا من نسخ البطولات، وواجه بطلًا تاريخيًا لكأس العالم، واكتب التاريخ من جديد.", twitterDescription: "ابنِ التشكيلة. وتحدَّ التاريخ." },
    openGraph: { history: "التاريخ", finalRecord: "السجل النهائي", openMatch: "افتح المباراة · شاهد الفريقين · عِش مجريات اللقاء" },
    common: { dismissNotice: "إغلاق الإشعار" },
    manager: { offenseShort: "هجوم", defenseShort: "دفاع", leadershipShort: "قيادة", gameManagementShort: "إدارة" },
    result: { attackShort: "هجوم", midfieldShort: "وسط", defenseShort: "دفاع", chemistryShort: "تناغم", overallShort: "عام", positionShort: "مركز", eraShort: "حقبة", managerShort: "مدرب" },
    database: { overallShort: "عام" }, free: { overallShort: "عام" }, worldCup: { overallShort: "عام" },
    teamRatings: { aria: "تقييمات الفريق", attackShort: "هجوم", midfieldShort: "وسط", defenseShort: "دفاع", chemistryShort: "تناغم", overallShort: "عام", cohesion: "الانسجام", manager: "المدرب", balance: "التوازن", era: "الحقبة", squadLegacy: "إرث التشكيلة", legacyTiers: { immortal: "خالد", legendary: "أسطوري", decorated: "حافل", established: "راسخ", building: "قيد البناء" }, overallBoost: "تعزيز التقييم", legacyAria: "إرث التشكيلة {score} من 100، وتعزيز التقييم زائد {bonus}", legacyFactors: "البطولات · الجوائز · ألقاب المسيرة", chemistry: "التناغم", chemistryStates: { elite: "نخبوي", strong: "قوي", balanced: "متوازن", developing: "يتطور", disconnected: "غير مترابط" }, factorAria: "{label}: {value} من 100" },
    reveal: { allStarsLogo: "شعار فريق النجوم", crestAria: "شعار {team}", startingXi: "التشكيلة الأساسية" },
    shared: { allStars: "فريق النجوم", overallShort: "عام" },
  },
  fr: {
    metadata: { defaultTitle: "Trophy XI — Composez le XI. Défiez l’histoire.", description: "Sélectionnez des performances légendaires en tournoi et défiez les plus grands champions du monde de l’histoire.", openGraphDescription: "Sélectionnez quatorze joueurs de tournoi. Affrontez un champion du monde historique. Réécrivez l’histoire.", twitterDescription: "Composez le XI. Défiez l’histoire." },
    openGraph: { history: "Histoire", finalRecord: "RÉSULTAT FINAL", openMatch: "OUVREZ LE MATCH · VOYEZ LES ÉQUIPES · REVIVEZ LA CHRONOLOGIE" },
    common: { dismissNotice: "Fermer l’avis" },
    manager: { offenseShort: "ATT", defenseShort: "DÉF", leadershipShort: "LEAD", gameManagementShort: "MATCH" },
    result: { attackShort: "ATT", midfieldShort: "MIL", defenseShort: "DÉF", chemistryShort: "ENT", overallShort: "GÉN", positionShort: "POS", eraShort: "ÈRE", managerShort: "ENT" },
    database: { overallShort: "GÉN" }, free: { overallShort: "GÉN" }, worldCup: { overallShort: "GÉN" },
    teamRatings: { aria: "Évaluations de l’équipe", attackShort: "ATT", midfieldShort: "MIL", defenseShort: "DÉF", chemistryShort: "ENT", overallShort: "GÉN", cohesion: "COHÉSION", manager: "SÉLECTIONNEUR", balance: "ÉQUILIBRE", era: "ÈRE", squadLegacy: "HÉRITAGE DU GROUPE", legacyTiers: { immortal: "IMMORTEL", legendary: "LÉGENDAIRE", decorated: "TITRÉ", established: "CONFIRMÉ", building: "EN CONSTRUCTION" }, overallBoost: "BONUS GÉNÉRAL", legacyAria: "Héritage du groupe : {score} sur 100, bonus général plus {bonus}", legacyFactors: "Tournois · Récompenses · Palmarès", chemistry: "ENTENTE", chemistryStates: { elite: "ÉLITE", strong: "FORTE", balanced: "ÉQUILIBRÉE", developing: "EN PROGRÈS", disconnected: "DÉCONNECTÉE" }, factorAria: "{label} : {value} sur 100" },
    reveal: { allStarsLogo: "Écusson des All-Stars", crestAria: "Écusson de {team}", startingXi: "ONZE DE DÉPART" },
    shared: { allStars: "All-Stars", overallShort: "GÉN" },
  },
  ru: {
    metadata: { defaultTitle: "Trophy XI — Соберите XI. Бросьте вызов истории.", description: "Выбирайте легендарные версии игроков с чемпионатов мира и бросайте вызов величайшим чемпионам в истории.", openGraphDescription: "Выберите четырнадцать турнирных игроков. Сразитесь с историческим чемпионом мира. Перепишите историю.", twitterDescription: "Соберите XI. Бросьте вызов истории." },
    openGraph: { history: "История", finalRecord: "ИТОГОВЫЙ ПРОТОКОЛ", openMatch: "ОТКРОЙТЕ МАТЧ · ПОСМОТРИТЕ СОСТАВЫ · ПЕРЕЖИВИТЕ ЕГО СНОВА" },
    common: { dismissNotice: "Закрыть уведомление" },
    manager: { offenseShort: "АТК", defenseShort: "ЗАЩ", leadershipShort: "ЛИД", gameManagementShort: "ИГРА" },
    result: { attackShort: "АТК", midfieldShort: "ПЗ", defenseShort: "ЗАЩ", chemistryShort: "СЫГР", overallShort: "ОБЩ", positionShort: "ПОЗ", eraShort: "ЭРА", managerShort: "ТРЕН" },
    database: { overallShort: "ОБЩ" }, free: { overallShort: "ОБЩ" }, worldCup: { overallShort: "ОБЩ" },
    teamRatings: { aria: "Рейтинги команды", attackShort: "АТК", midfieldShort: "ПЗ", defenseShort: "ЗАЩ", chemistryShort: "СЫГР", overallShort: "ОБЩ", cohesion: "СЫГРАННОСТЬ", manager: "ТРЕНЕР", balance: "БАЛАНС", era: "ЭПОХА", squadLegacy: "НАСЛЕДИЕ СОСТАВА", legacyTiers: { immortal: "БЕССМЕРТНЫЙ", legendary: "ЛЕГЕНДАРНЫЙ", decorated: "ТИТУЛОВАННЫЙ", established: "ПРИЗНАННЫЙ", building: "ФОРМИРУЕТСЯ" }, overallBoost: "БОНУС РЕЙТИНГА", legacyAria: "Наследие состава: {score} из 100, бонус рейтинга плюс {bonus}", legacyFactors: "Турниры · Награды · Трофеи карьеры", chemistry: "СЫГРАННОСТЬ", chemistryStates: { elite: "ЭЛИТНАЯ", strong: "СИЛЬНАЯ", balanced: "СБАЛАНСИРОВАННАЯ", developing: "РАЗВИВАЕТСЯ", disconnected: "РАЗОБЩЁННАЯ" }, factorAria: "{label}: {value} из 100" },
    reveal: { allStarsLogo: "Эмблема сборной звёзд", crestAria: "Эмблема {team}", startingXi: "СТАРТОВЫЙ СОСТАВ" },
    shared: { allStars: "Сборная звёзд", overallShort: "ОБЩ" },
  },
  de: {
    metadata: { defaultTitle: "Trophy XI — Baue deine XI. Fordere die Geschichte heraus.", description: "Wähle legendäre Turnierleistungen und fordere die größten Weltmeister der Geschichte heraus.", openGraphDescription: "Wähle vierzehn Turnierspieler. Tritt gegen einen historischen Weltmeister an. Schreibe Geschichte neu.", twitterDescription: "Baue deine XI. Fordere die Geschichte heraus." },
    openGraph: { history: "Geschichte", finalRecord: "ENDPROTOKOLL", openMatch: "SPIEL ÖFFNEN · TEAMS ANSEHEN · SPIELVERLAUF NACHERLEBEN" },
    common: { dismissNotice: "Hinweis schließen" },
    manager: { offenseShort: "ANG", defenseShort: "DEF", leadershipShort: "FÜHR", gameManagementShort: "SPIEL" },
    result: { attackShort: "ANG", midfieldShort: "MIT", defenseShort: "DEF", chemistryShort: "CHEM", overallShort: "GES", positionShort: "POS", eraShort: "ÄRA", managerShort: "TR" },
    database: { overallShort: "GES" }, free: { overallShort: "GES" }, worldCup: { overallShort: "GES" },
    teamRatings: { aria: "Teamwertungen", attackShort: "ANG", midfieldShort: "MIT", defenseShort: "DEF", chemistryShort: "CHEM", overallShort: "GES", cohesion: "ZUSAMMENSPIEL", manager: "TRAINER", balance: "BALANCE", era: "ÄRA", squadLegacy: "KADERVERMÄCHTNIS", legacyTiers: { immortal: "UNSTERBLICH", legendary: "LEGENDÄR", decorated: "TITELREICH", established: "ETABLIERT", building: "IM AUFBAU" }, overallBoost: "GES-BONUS", legacyAria: "Kadervermächtnis {score} von 100, Gesamtbonus plus {bonus}", legacyFactors: "Turniere · Auszeichnungen · Karriereerfolge", chemistry: "CHEMIE", chemistryStates: { elite: "ELITE", strong: "STARK", balanced: "AUSGEWOGEN", developing: "IN ENTWICKLUNG", disconnected: "UNVERBUNDEN" }, factorAria: "{label}: {value} von 100" },
    reveal: { allStarsLogo: "All-Stars-Wappen", crestAria: "Wappen von {team}", startingXi: "STARTELF" },
    shared: { allStars: "All-Stars", overallShort: "GES" },
  },
  it: {
    metadata: { defaultTitle: "Trophy XI — Crea il tuo XI. Sfida la storia.", description: "Scegli prestazioni leggendarie dei Mondiali e sfida i più grandi campioni della storia.", openGraphDescription: "Scegli quattordici giocatori da torneo. Affronta un campione del mondo storico. Riscrivi la storia.", twitterDescription: "Crea il tuo XI. Sfida la storia." },
    openGraph: { history: "Storia", finalRecord: "VERDETTO FINALE", openMatch: "APRI LA PARTITA · GUARDA LE SQUADRE · RIVIVI LA CRONOLOGIA" },
    common: { dismissNotice: "Chiudi avviso" },
    manager: { offenseShort: "ATT", defenseShort: "DIF", leadershipShort: "LEAD", gameManagementShort: "PART" },
    result: { attackShort: "ATT", midfieldShort: "CEN", defenseShort: "DIF", chemistryShort: "INT", overallShort: "GEN", positionShort: "POS", eraShort: "ERA", managerShort: "ALL" },
    database: { overallShort: "GEN" }, free: { overallShort: "GEN" }, worldCup: { overallShort: "GEN" },
    teamRatings: { aria: "Valutazioni della squadra", attackShort: "ATT", midfieldShort: "CEN", defenseShort: "DIF", chemistryShort: "INT", overallShort: "GEN", cohesion: "COESIONE", manager: "ALLENATORE", balance: "EQUILIBRIO", era: "EPOCA", squadLegacy: "EREDITÀ DELLA ROSA", legacyTiers: { immortal: "IMMORTALE", legendary: "LEGGENDARIA", decorated: "TITOLATA", established: "AFFERMATA", building: "IN COSTRUZIONE" }, overallBoost: "BONUS GENERALE", legacyAria: "Eredità della rosa {score} su 100, bonus generale più {bonus}", legacyFactors: "Tornei · Premi · Titoli in carriera", chemistry: "INTESA", chemistryStates: { elite: "ÉLITE", strong: "FORTE", balanced: "EQUILIBRATA", developing: "IN CRESCITA", disconnected: "SCOLLEGATA" }, factorAria: "{label}: {value} su 100" },
    reveal: { allStarsLogo: "Stemma degli All-Stars", crestAria: "Stemma di {team}", startingXi: "UNDICI TITOLARE" },
    shared: { allStars: "All-Stars", overallShort: "GEN" },
  },
};

for (const [locale, values] of Object.entries(repairs)) {
  const file = path.join(root, "messages", `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, "utf8"));
  Object.assign(messages.common ??= {}, values.common);
  Object.assign(messages.metadata ??= {}, values.metadata);
  Object.assign(messages.openGraph ??= {}, values.openGraph);
  Object.assign((messages.gameSetup ??= {}).manager ??= {}, values.manager);
  Object.assign((messages.results ??= {}).page ??= {}, values.result);
  Object.assign((messages.players ??= {}).database ??= {}, values.database);
  Object.assign((messages.draft ??= {}).teamRatings ??= {}, values.teamRatings);
  Object.assign(messages.freeSelection ??= {}, values.free);
  Object.assign(messages.worldCupRun ??= {}, values.worldCup);
  Object.assign(messages.matchReveal ??= {}, values.reveal);
  Object.assign(messages.sharedGame ??= {}, values.shared);

  if (locale !== "en") {
    for (const [key, localizedValue] of flatten(messages)) {
      const englishValue = englishFlat.get(key);
      if (typeof englishValue !== "string" || typeof localizedValue !== "string") continue;
      const sourceNames = [...englishValue.matchAll(placeholderPattern)].map((match) => match[1]);
      const localizedNames = [...localizedValue.matchAll(placeholderPattern)].map((match) => match[1]);
      if (sourceNames.length && sourceNames.length === localizedNames.length) {
        let placeholderIndex = 0;
        setPath(messages, key, localizedValue.replace(placeholderPattern, () => `{${sourceNames[placeholderIndex++]}`));
      }
    }
  }

  for (const [key, value] of Object.entries(manualMessages[locale] ?? {})) setPath(messages, key, value);
  fs.writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
}
