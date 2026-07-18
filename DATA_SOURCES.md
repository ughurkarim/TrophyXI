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

`src/data/archive-eligibility.ts` declares the 51 player cards and 10 manager
cards eligible for the current draft. The remaining typed records are
research-only and cannot enter runtime offers. Active records require complete
local licensed-image attribution. Eligibility is an editorial/source-readiness
boundary, not a claim that inactive historical figures were less important.

## Historical World Cup participants

The historical-opponent pipeline vendors three tables from:

- The Fjelstul World Cup Database v1.2.0
- Joshua C. Fjelstul, Ph.D.
- https://github.com/jfjelstul/worldcup
- accessed 2026-07-18

`qualified_teams.csv`, `tournaments.csv`, and `teams.csv` support tournament
participant identity, nation code/name, confederation, tournament finish, and
match count. `scripts/import-world-cup-teams.ts` normalizes these records into 368
unique nation-year ids and validates the official field size for all 14 editions
from 1970 through 2022.

The 2026 participant set is maintained separately from:

- FIFA — “World Cup 2026: Who has qualified?”
- https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-2026-who-has-qualified
- accessed 2026-07-18

It supports the 48 participant identities only. The local tournament record is
marked `Tournament in progress`; champion, finish, manager, starting lineup,
advancement, awards, match count, results, and detailed statistics remain `null`
or empty. No 2026 champion can pass validation without verified local result
data.

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

All listed web sources were accessed on 2026-07-18.
