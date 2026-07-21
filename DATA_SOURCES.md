# Trophy XI data sources

## Evidence model

Player ratings, seven player attributes, Era Translation traits, manager OFF/DEF
grades, formation tendencies, opponent ratings, tactical profiles, difficulty,
and model formations are original Trophy XI gameplay estimates. They are not
official ratings, factual career measurements, or claims that every team in an
era played identically.

Tournament statistics are nullable. A populated value requires a record-level
`DataCitation`; an unknown value remains `null` and renders as “Not sourced.”
Named achievements require their own citation. Validation rejects a known player
stat line without a source and never converts missing data to zero. Trophy XI
modeled tags are stored separately from sourced accolades and are described as
engine behavior, not factual honors.

## Active archive boundary

`src/data/archive-eligibility.ts` declares all 629 player cards and 49 manager
cards eligible for the current draft. Research-only records remain outside that
boundary and cannot enter runtime offers. Image availability does not control
eligibility; an exact-year face without a complete manifest record remains Photo
Pending.

## Historical World Cup participants

The historical-opponent and tournament-card pipelines vendor tables from:

- The Fjelstul World Cup Database v1.2.0
- Joshua C. Fjelstul, Ph.D.
- https://github.com/jfjelstul/worldcup
- © 2023 Joshua C. Fjelstul
- CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
- accessed 2026-07-18

`qualified_teams.csv`, `tournaments.csv`, and `teams.csv` support tournament
participant identity, nation code/name, confederation, tournament finish, and
match count. `scripts/import-world-cup-teams.ts` normalizes these records into 368
unique nation-year ids and validates the official field size for all 14 editions
from 1970 through 2022.

`squads.csv`, `players.csv`, `player_appearances.csv`, `goals.csv`, and
`award_winners.csv` support the player tournament-card audit.
`scripts/generate-player-tournament-data.ts` filters the source to actual match
appearances from 1970–2022, maps those records to stable Trophy XI identities, and
aggregates appearances, starts, non-own goals, observed tactical positions, team
performance, and published tournament awards. The generated file records these
modifications and the source license. `manager_appointments.csv` and
`managers.csv` support the expanded manager identity/year pool.

## EA/SoFIFA player-face identity index

The candidate generator uses `male_players (legacy).csv` from Stefano Leone's
“FIFA 23 complete player dataset” only as a name, birth-date, game-version, and
face-URL index:

- https://www.kaggle.com/datasets/stefanoleone992/fifa-23-complete-player-dataset
- CC0 1.0
- accessed 2026-07-18

`scripts/generate-game-face-candidates.ts` retains only exact
name-and-birth-date matches with `real_face=Yes`. Tournament cards use the
in-season editions available by that World Cup's June: FIFA 14, FIFA 18, and
FIFA 22, never the following season's FIFA 15/19/23 face. Because the public
legacy CSV begins at FIFA 15, its FIFA 15 row is used only to resolve the
reviewed FIFA 14 asset's player id. Ambiguous, birth-date-only, and generic-face
rows are excluded. Image use remains governed by the separate project-specific
EA/SoFIFA permission and required attribution; the CC0 index does not replace
those image terms. No 2006 or 2010 face is activated; those tournament cards
remain Photo Pending. The reviewed in-season production archive begins with
FIFA 14. The two verified 2026 cards use the manually reviewed EA SPORTS FC 26
SoFIFA records for player ids 158023 and 20801, both marked `real_face=Yes`.
The former public nearby-year/modern-photo portrait pipeline has been removed;
only importer-manifested card/year assets can be served as player faces.

The 2026 participant set is maintained separately from:

- FIFA — “World Cup 2026: Who has qualified?”
- https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-2026-who-has-qualified
- accessed 2026-07-18

It supports the 48 opponent participant identities. Two separate live player
records are sourced directly from FIFA: Lionel Messi 2026 and Cristiano Ronaldo
2026. FIFA’s 14 July statistics snapshot supports Messi’s eight goals and four
assists and Ronaldo’s three goals; FIFA match reporting supports their named
six-tournament scoring records. Unfinished appearance/start/minute totals remain
`null`. The local tournament record remains `Tournament in progress`; no 2026
champion can pass validation without verified local result data.

The combined browser therefore contains 416 unique nation-year ids across 15
editions. The current sources do not contain record-level tournament managers,
lineups, goals for/against, wins/draws/losses, or clean sheets. Those fields stay
`null` or empty where unavailable and the validation report states that coverage
gap. Formations, ratings, tactical profiles, and difficulty are marked Trophy XI
models rather than sourced facts.

## World Cup All-Stars evidence boundary

World Cup All-Stars is not a historical participant or a factual all-time team.
Its curated 4–3–3, three substitutes, design rationales, 98/98 composite-manager
grades, chemistry, and capped Mythic modifiers are original Trophy XI game
design. Every footballer references an existing tournament-specific player card;
the manager is explicitly labeled “Trophy XI original composite manager.”

## Future team-stat, squad, lineup, and manager sourcing

Additions must attach a source directly to the nation-year record and distinguish:

- tournament participant/finish source
- team-stat source
- official or reputable squad source
- lineup/match-sheet source
- tournament-manager source

Prefer the tournament organizer, federation archives, official reports, or a
reputable structured research database. Do not infer a tournament lineup from a
career squad, a nearby-year friendly, or a formation diagram without provenance.

When two reliable sources conflict, prefer the most direct primary record,
preserve the conflicting reference in review notes, and leave the field missing
when the conflict cannot be resolved. Historical country names and codes remain
as represented by the source; nation-year ids are never collapsed into a modern
successor identity.

## Published player-card sources

### FIFA — Russia 2018 awards

https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/157-awards-piece-2986294

Supports the 2018 Golden Ball, Golden Glove, Young Player Award, Bronze Ball, and
Golden Boot, plus published goal/assist or clean-sheet statements on those cards.

### FIFA — Russia 2018 player statistics

https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/will-world-cup-stars-shine-at-the-best

Supports Luka Modrić’s appearances/minutes/goals/assist, Thibaut Courtois’s clean
sheets, and selected published 2018 goal totals.

### FIFA Publications — Qatar 2022 summary

https://publications.fifa.com/en/annual-report-2022/2022-at-a-glance/fifa-world-cup-qatar-2022-summary/

Supports the 2022 Golden Ball, Golden Boot, Golden Glove, and Young Player Award.

### FIFA — World Cup 2026 live statistics and records

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/fifa-world-cup-key-statistics

https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/cristiano-ronaldo-portugal-goal-record

Supports the live 2026 Messi/Ronaldo scoring profile and Ronaldo’s
six-World-Cup scoring record. The Messi tournament card also cites FIFA’s
Argentina–Austria match report for the all-time scoring-record milestone.

All listed web sources were accessed on 2026-07-18.
