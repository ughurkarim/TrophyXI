import type {
  PlayerAccolade,
  PlayerAccoladeCategory,
  PlayerCareerStats,
} from "@/types/game";

export type FbrefPlayerMapping = {
  playerIdentityId: string;
  playerName: string;
  fbrefProfileName?: string;
  fbrefId: string;
  sourceUrl: string;
};

export type ParsedFbrefPlayer = {
  playerIdentityId: string;
  careerStats: PlayerCareerStats;
  accolades: PlayerAccolade[];
};

const decodeEntities = (value: string) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    );

const textContent = (value: string) =>
  decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const normalizedName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const countFrom = (value: string | undefined) => {
  if (!value) return null;
  const normalized = textContent(value).replaceAll(",", "");
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
};

const cellFrom = (row: string, stat: string) =>
  row.match(
    new RegExp(
      `<(?:th|td)[^>]*data-stat=["']${stat}["'][^>]*>([\\s\\S]*?)<\\/(?:th|td)>`,
      "i",
    ),
  )?.[1];

const tableFrom = (html: string, id: string) =>
  html.match(
    new RegExp(
      `<table[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/table>`,
      "i",
    ),
  )?.[1] ?? "";

const careerRowFrom = (table: string) => {
  const footer = table.match(/<tfoot[^>]*>([\s\S]*?)<\/tfoot>/i)?.[1] ?? table;
  const rows = [...footer.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (match) => match[1],
  );
  return (
    rows.find((row) => /\bCareer\b/i.test(textContent(row))) ??
    rows[0] ??
    ""
  );
};

export const normalizeCompetitionName = (label: string) => {
  const normalized = label.trim().replace(/\s+/g, " ");
  if (/^(?:UEFA )?Champions League Champion$/i.test(normalized)) {
    return "UEFA Champions League Champion";
  }
  if (/^(?:European Cup|European Champion Clubs' Cup) Champion$/i.test(normalized)) {
    return "UEFA Champions League Champion";
  }
  const aliases: Record<string, string> = {
    "European Cup": "UEFA Champions League",
    "Champions League": "UEFA Champions League",
    "European Champion Clubs' Cup": "UEFA Champions League",
    "UEFA Cup": "UEFA Europa League",
    "Inter-Cities Fairs Cup": "UEFA Europa League",
    "Copa de Europa": "UEFA Champions League",
  };
  return aliases[normalized] ?? normalized;
};

export const accoladeCategoryFor = (
  label: string,
): PlayerAccoladeCategory => {
  if (
    /ballon|golden|bronze ball|silver ball|all-star|world xi|team of the (?:year|tournament)|player of the|footballer/i.test(
      label,
    )
  ) {
    return "individual";
  }
  if (/world cup|copa am[eé]rica|euro|nations league/i.test(label)) {
    return "international";
  }
  if (/champions league|european cup|europa|uefa cup|libertadores/i.test(label)) {
    return "continental";
  }
  if (/cup|copa del rey|fa cup|coppa italia/i.test(label)) {
    return "domestic-cup";
  }
  if (/league|liga|serie a|premier/i.test(label)) {
    return "domestic-league";
  }
  return "individual";
};

const accoladeIdFor = (label: string) =>
  normalizeCompetitionName(label)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const statIdPart = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const competitionRowsFrom = (
  html: string,
  tableId: string,
  scope: PlayerCareerStats["competitionStats"][number]["scope"],
) => {
  const table = tableFrom(html, tableId);
  const body = table.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => match[1])
    .map((row) => {
      const season = textContent(cellFrom(row, "year_id") ?? cellFrom(row, "season") ?? "");
      const rawCompetition = textContent(cellFrom(row, "comp_level") ?? cellFrom(row, "comp") ?? "");
      const competition = normalizeCompetitionName(rawCompetition);
      const squad = textContent(cellFrom(row, "team") ?? cellFrom(row, "squad") ?? "");
      if (!season || !competition) return null;
      return {
        id: [
          scope,
          statIdPart(season),
          statIdPart(competition),
          statIdPart(squad || "national-team"),
        ].join("-"),
        season,
        competition,
        scope,
        squad: squad || null,
        appearances: countFrom(cellFrom(row, "games")),
        goals: countFrom(cellFrom(row, "goals")),
        assists: countFrom(cellFrom(row, "assists")),
      };
    })
    .filter(
      (
        row,
      ): row is NonNullable<typeof row> => Boolean(row),
    );
};

export const dedupeAccolades = (accolades: PlayerAccolade[]) => {
  const unique = new Map<string, PlayerAccolade>();
  for (const accolade of accolades) {
    const key = `${accolade.category}:${accolade.id}`;
    const previous = unique.get(key);
    if (
      !previous ||
      (accolade.count ?? 1) > (previous.count ?? 1) ||
      (!previous.verified && accolade.verified)
    ) {
      unique.set(key, accolade);
    }
  }
  return [...unique.values()];
};

export const parseFbrefAccolades = (
  html: string,
  sourceUrl: string,
): PlayerAccolade[] => {
  const bling =
    html.match(/<ul[^>]*id=["']bling["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ??
    "";
  const imported = new Map<string, PlayerAccolade>();
  for (const match of bling.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const rawLabel = textContent(match[1]);
    if (!rawLabel) continue;
    const countMatch = rawLabel.match(/^(\d+)x\s+(.+)$/i);
    const count = countMatch ? Number(countMatch[1]) : 1;
    const datedLabel = (countMatch?.[2] ?? rawLabel).match(
      /^(?:\d{4}(?:-\d{2,4})?)\s+(.+)$/,
    );
    if (!countMatch && !datedLabel) continue;
    const label = normalizeCompetitionName(
      (datedLabel?.[1] ?? countMatch?.[2] ?? rawLabel).trim(),
    );
    if (!label || !Number.isInteger(count) || count < 1) continue;
    const accolade = {
      id: accoladeIdFor(label),
      label,
      count,
      category: accoladeCategoryFor(label),
      sourceName: "FBref",
      sourceUrl,
      verified: true,
      description:
        rawLabel === label ? undefined : `FBref profile honor: ${rawLabel}.`,
    } satisfies PlayerAccolade;
    const key = `${accolade.category}:${accolade.id}`;
    const previous = imported.get(key);
    if (!previous || (previous.count ?? 1) < count) {
      imported.set(key, accolade);
    }
  }
  return [...imported.values()];
};

export const isFbrefChallengePage = (html: string) =>
  /challenges\.cloudflare\.com|cf-chl-|<title>Just a moment\.\.\.<\/title>/i.test(
    html,
  );

export const parseFbrefPlayerPage = (
  html: string,
  mapping: FbrefPlayerMapping,
  retrievedOn: string,
): ParsedFbrefPlayer => {
  if (isFbrefChallengePage(html)) {
    throw new Error("FBref returned an access challenge instead of a player page");
  }
  const heading = textContent(
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "",
  );
  const acceptedNames = [
    mapping.playerName,
    ...(mapping.fbrefProfileName ? [mapping.fbrefProfileName] : []),
  ].map(normalizedName);
  if (!heading || !acceptedNames.includes(normalizedName(heading))) {
    throw new Error(
      `${mapping.playerIdentityId}: FBref identity mismatch (${heading || "missing h1"})`,
    );
  }

  const domesticRow = careerRowFrom(
    tableFrom(html, "stats_standard_dom_lg"),
  );
  const nationalRow = careerRowFrom(
    tableFrom(html, "stats_standard_nat_tm"),
  );
  const clubAppearances = countFrom(cellFrom(domesticRow, "games"));
  const clubGoals = countFrom(cellFrom(domesticRow, "goals"));
  const clubAssists = countFrom(cellFrom(domesticRow, "assists"));
  const nationalTeamAppearances = countFrom(cellFrom(nationalRow, "games"));
  const nationalTeamGoals = countFrom(cellFrom(nationalRow, "goals"));
  const competitionStats = [
    ...competitionRowsFrom(
      html,
      "stats_standard_dom_lg",
      "domestic-league",
    ),
    ...competitionRowsFrom(
      html,
      "stats_standard_dom_cup",
      "domestic-cup",
    ),
    ...competitionRowsFrom(
      html,
      "stats_standard_intl_cup",
      "continental",
    ),
    ...competitionRowsFrom(
      html,
      "stats_standard_nat_tm",
      "international",
    ),
  ];

  return {
    playerIdentityId: mapping.playerIdentityId,
    careerStats: {
      clubAppearances,
      clubGoals,
      clubAssists,
      nationalTeamAppearances,
      nationalTeamGoals,
      sourceName: "FBref",
      sourceUrl: mapping.sourceUrl,
      retrievedOn,
      coverageNote:
        "FBref coverage varies by competition and era; null values remain unknown.",
      competitionStats: [
        ...new Map(competitionStats.map((record) => [record.id, record])).values(),
      ],
    },
    accolades: parseFbrefAccolades(html, mapping.sourceUrl),
  };
};
