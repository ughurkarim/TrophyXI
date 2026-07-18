# Trophy XI

Trophy XI is an original browser-based historical football drafting game with a
deterministic knockout-match engine. Choose the historical conditions of the
match, combine tournament-specific players from 1970–2022, order a three-player
bench, and face a 1970–2026 nation-year participant or the featured World Cup
All-Stars.

## Run locally

```bash
npm install
npm run images:import
npm run players:import:fbref
npm run opponents:import
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run validate:data
npm run opponents:validate
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`validate:data` reports archive, identity, role, tournament, image, attribution,
status-tier, rating-cap, weighted-offer, Era Translation, manager-grade,
formation-offer, bench, flag, chemistry-preview, and historical-opponent coverage.
`opponents:validate` independently checks nation-year counts and sources.

## Product flow

`/` → match era → manager → optional Manager Respin → four formation choices → optional Formation Respin
→ formation → 11 player-first starter rounds → 3 bench rounds → bench review
→ opponent selection → match broadcast → result

Every player round presents five unique identities. Selecting a card only opens
the Position Fit preview; a second click on an eligible pitch slot commits the
placement. Green, yellow, red, and incompatible states show exact fit and the
same placement penalty used by team ratings and simulation. A completion-path
validator prevents a placement or offer from making the formation impossible.
The top-right Chemistry HUD always shows the committed value; after card
selection it shows the production-engine projection for the best legal slot, then
recalculates for the exact slot under pointer or keyboard focus. The committed
result must equal the final preview.

`/credits` contains image/data policy and item-level image attribution.

The current archive contains:

- 310 tournament cards across 287 stable player identities
- all 310 player cards are draft eligible; missing photographs never change
  card eligibility
- 0 exact-year local player faces and 310 clean Photo Pending identity markers;
  cards automatically stay pending until a card-specific approved PNG is added
- every men’s World Cup from 1970 through 2022
- 28 manager cards with explicit numeric OFF/DEF grades
- all 28 audited manager cards draft eligible, currently with Photo Pending
- five deterministic, identity-safe manager choices per offer
- 12 formations, with four deterministic manager/era-aware offers per run
- one separate, deterministic, permanent Manager Respin
- one separate, deterministic Formation Respin
- five-card, player-first drafting with two-click placement
- two permanent, deterministic, player-only respins
- three ordered bench places drafted from five-card options
- 416 nation-year opponent records across 15 tournaments, including 48 sourced
  2026 participants with unknown tournament outcomes left null
- World Cup All-Stars: an original, deterministic, beatable Mythic opponent;
  the composite team is never user-controlled
- 0 active exact-year face masters; every player and manager currently uses the
  non-photographic Photo Pending treatment

## Match environment and card year

The selected era is the environment in which the match occurs, not a card-pool
filter. A 2022 card can play in a 1970s environment and a 1970 card can play in
the 2020s. Trophy XI Era Translation evaluates that move using tournament-year
distance, direction, role, archetype, formation, manager style, timelessness,
adaptability attributes, and the environment’s demands. The same model applies
to the historical opponent.

## Architecture

- `src/data`: typed players, managers, eras, formations, images, and opponents
- `src/engine`: pure seeded draft, translation, fit, ratings, and simulation logic
- `src/store`: versioned Zustand persistence, migration, and hydration repair
- `src/components`: accessible feature-oriented presentation
- `src/app`: Next.js App Router pages
- `src/data/game-face-manifest.generated.json`: importer-owned exact-year image manifest
- `src/data/player-career.generated.json`: normalized career-data output
- `scripts/import-player-images.ts`: license-gated exact-year PNG importer
- `scripts/import-fbref-player-data.ts`: cached, rate-limited FBref normalizer
- `scripts/import-world-cup-teams.ts`: vendored participant ingestion
- `scripts/validate-data.ts`: executable content and feasibility contract
- `scripts/validate-world-cup-teams.ts`: opponent-count/source validator

The UI and store call pure engine functions. Identical simulation inputs and seed
produce the same event sequence, substitutions, minutes, and result. Version-7
Zustand persistence stores all three independent respin counters, current five-card
offer, selected-player preview, projected fits, placements, feasibility, bench,
opponent filters and selection, and match state. Version-4 saves are migrated or
repaired at hydration boundaries.

Opponent selection opens with the accessible `Champions Only` switch enabled.
Winners are newest first; switching it off reveals all historical participants
without hiding the featured World Cup All-Stars. The match never starts until the
user selects and confirms an opponent.

## Evidence policy

Ratings, tactical profiles, formations attached to historical opponents, manager
grades, and Era Translation traits are original Trophy XI game estimates—not
official or factual ratings. Tournament statistics are nullable and only populated
with an attached published source; unknown values never become zero. Historical
opponent participant identity, finish, and match count through 2022 use the
vendored Fjelstul World Cup Database. The 2026 participant set uses FIFA’s
published qualified-team list; no champion, finish, lineup, manager, or tournament
statistic is inferred. Missing fields remain null until a suitable record-level
source is ingested.

Images never hotlink at runtime. A player face can resolve only from
`public/players/game-faces/{player-card-id}.png`; manager faces use the equivalent
manager directory. Active images require source, author, reusable license, exact
tournament context, modifications, and a preserved source file. No version may
reuse another tournament year’s face.

### Exact-year face import

Add reviewed candidates to `scripts/game-face-import-sources.json`, then run:

```bash
npm run images:import
```

Each candidate must identify its card id, kind, tournament year, game edition,
source site and URL, rights holder, reusable license, retrieval date, match
quality, and exact-year evidence. The importer rate-limits requests, validates
real image bytes, preserves the source, converts to a 512×512 PNG, caches
completed work, and writes both the runtime manifest and
`scripts/reports/game-face-import-report.json`. One failure never stops the
remaining queue. Unconfigured or rejected cards remain Photo Pending.

Protected SoFIFA, FIFA, EA, FUTBIN, and FUTWIZ game artwork is deliberately
rejected by the importer. A source must carry explicit reusable rights; finding
an image on a game database is not permission to copy it.

### FBref career-data import

`scripts/fbref-player-map.json` contains reviewed identity mappings.
`scripts/player-career-curation.json` contains supplementary sourced honors and
the explicit Trophy XI Top 100 curation note. Run cache-only normalization with:

```bash
npm run players:import:fbref
```

To refresh mapped pages when FBref’s robots policy and access controls permit:

```bash
npm run players:refresh:fbref
```

The refresh command reads robots policy first, identifies itself, waits at least
ten seconds between profile requests, backs off on 429/503 responses, caches
pages, verifies the player heading, normalizes renamed competitions, deduplicates
accolades, and writes `src/data/player-career.generated.json`. Access challenges
are never bypassed. Unmapped, blocked, or ambiguous identities remain draftable
and are listed in `scripts/reports/fbref-import-report.json` for manual review.
Only positive, verified, source-linked accolades reach the runtime.

Trophy XI is unofficial and is not affiliated with or endorsed by FIFA, any
federation, competition, team, manager, or player.
