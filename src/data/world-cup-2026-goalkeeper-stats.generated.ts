export const worldCup2026GoalkeeperStats = {
  "unai-simon-2026": { appearances: 8, starts: 8, saves: 10, cleanSheets: 7, goalsConceded: 1, penaltiesSaved: 0 },
  "emiliano-martinez-2026": { appearances: 8, starts: 8, saves: 20, cleanSheets: 2, goalsConceded: 8, penaltiesSaved: 0 },
  "jordan-pickford-2026": { appearances: 7, starts: 7, saves: 19, cleanSheets: 2, goalsConceded: 8, penaltiesSaved: 0 },
  "yassine-bounou-2026": { appearances: 6, starts: 6, saves: 19, cleanSheets: 2, goalsConceded: 6, penaltiesSaved: 1 },
  "thibaut-courtois-2026": { appearances: 6, starts: 6, saves: 14, cleanSheets: 1, goalsConceded: 6, penaltiesSaved: 0 },
  "alisson-2026": { appearances: 5, starts: 5, saves: 14, cleanSheets: 2, goalsConceded: 4, penaltiesSaved: 0 },
  "diogo-costa-2026": { appearances: 5, starts: 5, saves: 20, cleanSheets: 2, goalsConceded: 3, penaltiesSaved: 0 },
  "marc-andre-ter-stegen-2026": { appearances: 0, starts: 0, saves: 0, cleanSheets: 0, goalsConceded: 0, penaltiesSaved: 0 },
  "vozinha-2026": { appearances: 4, starts: 4, saves: 18, cleanSheets: 2, goalsConceded: 5, penaltiesSaved: 0 },
  "patrick-beach-2026": { appearances: 4, starts: 4, saves: 14, cleanSheets: 2, goalsConceded: 3, penaltiesSaved: 0 },
  "eloy-room-2026": { appearances: 3, starts: 3, saves: 21, cleanSheets: 1, goalsConceded: 9, penaltiesSaved: 0 },
} as const;

export type WorldCup2026GoalkeeperCardId = keyof typeof worldCup2026GoalkeeperStats;
