import type { TournamentStatLine } from "@/types/game";

export type FbrefWorldCupSource = {
  tournamentYear: number;
  overviewUrl: string;
  standardUrl: string;
  keeperUrl: string;
};

export type FbrefWorldCupStatRecord = {
  tournamentYear: number;
  playerName: string;
  teamName: string | null;
  fbrefId: string | null;
  stats: TournamentStatLine;
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

const nullableCount = (value: string | undefined) => {
  if (value === undefined) return null;
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

const tableFrom = (html: string, ids: readonly string[]) => {
  for (const id of ids) {
    const table = html.match(
      new RegExp(
        `<table[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/table>`,
        "i",
      ),
    )?.[1];
    if (table) return table;
  }
  return "";
};

const bodyRowsFrom = (table: string) => {
  const body = table.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => match[1])
    .filter((row) => !/class=["'][^"']*\bspacer\b/i.test(row));
};

const fbrefIdFrom = (value: string | undefined) =>
  value?.match(/\/en\/players\/([a-f0-9]{8})(?:\/|["'])/i)?.[1] ?? null;

const emptyStats = (): TournamentStatLine => ({
  appearances: null,
  starts: null,
  minutes: null,
  goals: null,
  assists: null,
  cleanSheets: null,
  saves: null,
  goalsConceded: null,
  penaltiesSaved: null,
});

const standardStatsFrom = (row: string): TournamentStatLine => ({
  ...emptyStats(),
  appearances: nullableCount(cellFrom(row, "games")),
  starts: nullableCount(cellFrom(row, "games_starts")),
  minutes: nullableCount(cellFrom(row, "minutes")),
  goals: nullableCount(cellFrom(row, "goals")),
  assists: nullableCount(cellFrom(row, "assists")),
});

const keeperStatsFrom = (row: string): TournamentStatLine => ({
  ...emptyStats(),
  appearances: nullableCount(
    cellFrom(row, "gk_games") ?? cellFrom(row, "games"),
  ),
  starts: nullableCount(
    cellFrom(row, "gk_games_starts") ?? cellFrom(row, "games_starts"),
  ),
  minutes: nullableCount(
    cellFrom(row, "gk_minutes") ?? cellFrom(row, "minutes"),
  ),
  cleanSheets: nullableCount(cellFrom(row, "gk_clean_sheets")),
  saves: nullableCount(cellFrom(row, "gk_saves")),
  goalsConceded: nullableCount(
    cellFrom(row, "gk_goals_against") ?? cellFrom(row, "goals_against"),
  ),
  penaltiesSaved: nullableCount(
    cellFrom(row, "gk_pens_saved") ?? cellFrom(row, "pens_saved"),
  ),
});

const mergeStats = (
  first: TournamentStatLine,
  second: TournamentStatLine,
): TournamentStatLine =>
  Object.fromEntries(
    (Object.keys(first) as Array<keyof TournamentStatLine>).map((key) => [
      key,
      second[key] ?? first[key],
    ]),
  ) as TournamentStatLine;

const rowIdentity = (row: string) => {
  const playerCell = cellFrom(row, "player");
  const teamCell = cellFrom(row, "team") ?? cellFrom(row, "squad");
  return {
    playerName: textContent(playerCell ?? ""),
    teamName: textContent(teamCell ?? "") || null,
    fbrefId: fbrefIdFrom(playerCell),
  };
};

export const isFbrefAccessChallenge = (html: string) =>
  /challenges\.cloudflare\.com|cf-chl-|<title>Just a moment\.\.\.<\/title>|enable javascript and cookies to continue/i.test(
    html,
  );

export const worldCupSourceFor = (
  tournamentYear: number,
): FbrefWorldCupSource => {
  const overviewUrl =
    tournamentYear === 2026
      ? "https://fbref.com/en/comps/1/World-Cup-Stats"
      : `https://fbref.com/en/comps/1/${tournamentYear}/${tournamentYear}-World-Cup-Stats`;
  const base =
    tournamentYear === 2026
      ? "https://fbref.com/en/comps/1"
      : `https://fbref.com/en/comps/1/${tournamentYear}`;
  const suffix =
    tournamentYear === 2026
      ? "World-Cup-Stats"
      : `${tournamentYear}-World-Cup-Stats`;
  return {
    tournamentYear,
    overviewUrl,
    standardUrl: `${base}/stats/${suffix}`,
    keeperUrl: `${base}/keepers/${suffix}`,
  };
};

export const parseFbrefWorldCupCompetitionPages = ({
  standardHtml,
  keeperHtml,
  tournamentYear,
}: {
  standardHtml: string;
  keeperHtml: string;
  tournamentYear: number;
}): FbrefWorldCupStatRecord[] => {
  if (
    isFbrefAccessChallenge(standardHtml) ||
    isFbrefAccessChallenge(keeperHtml)
  ) {
    throw new Error("FBref returned an access challenge");
  }
  const records = new Map<string, FbrefWorldCupStatRecord>();
  const standardTable = tableFrom(standardHtml, [
    "stats_standard",
    "stats_standard_players",
  ]);
  for (const row of bodyRowsFrom(standardTable)) {
    const identity = rowIdentity(row);
    if (!identity.playerName) continue;
    const key =
      identity.fbrefId ??
      `${identity.playerName.toLocaleLowerCase()}:${identity.teamName ?? ""}`;
    records.set(key, {
      tournamentYear,
      ...identity,
      stats: standardStatsFrom(row),
    });
  }
  const keeperTable = tableFrom(keeperHtml, [
    "stats_keeper",
    "stats_keeper_players",
  ]);
  for (const row of bodyRowsFrom(keeperTable)) {
    const identity = rowIdentity(row);
    if (!identity.playerName) continue;
    const key =
      identity.fbrefId ??
      `${identity.playerName.toLocaleLowerCase()}:${identity.teamName ?? ""}`;
    const previous = records.get(key);
    records.set(key, {
      tournamentYear,
      ...identity,
      stats: previous
        ? mergeStats(previous.stats, keeperStatsFrom(row))
        : keeperStatsFrom(row),
    });
  }
  return [...records.values()];
};

export const parseFbrefWorldCupProfilePage = ({
  html,
  playerName,
  fbrefId,
}: {
  html: string;
  playerName: string;
  fbrefId: string;
}): FbrefWorldCupStatRecord[] => {
  if (isFbrefAccessChallenge(html)) {
    throw new Error("FBref returned an access challenge");
  }
  const records = new Map<number, FbrefWorldCupStatRecord>();
  const parseProfileTable = (
    ids: readonly string[],
    statsFrom: (row: string) => TournamentStatLine,
  ) => {
    for (const row of bodyRowsFrom(tableFrom(html, ids))) {
      const competition = textContent(cellFrom(row, "comp_level") ?? "");
      const yearLabel = textContent(
        cellFrom(row, "year_id") ?? cellFrom(row, "season") ?? "",
      );
      if (!/World Cup/i.test(competition) || !/^\d{4}$/.test(yearLabel)) {
        continue;
      }
      const tournamentYear = Number(yearLabel);
      const teamName =
        textContent(cellFrom(row, "team") ?? cellFrom(row, "squad") ?? "") ||
        null;
      const previous = records.get(tournamentYear);
      const stats = statsFrom(row);
      records.set(tournamentYear, {
        tournamentYear,
        playerName,
        teamName,
        fbrefId,
        stats: previous ? mergeStats(previous.stats, stats) : stats,
      });
    }
  };
  parseProfileTable(["stats_standard_nat_tm"], standardStatsFrom);
  parseProfileTable(["stats_keeper_nat_tm"], keeperStatsFrom);
  return [...records.values()].sort(
    (first, second) => first.tournamentYear - second.tournamentYear,
  );
};
