# Trophy XI

Trophy XI is an original browser-based historical football drafting game with a
deterministic knockout-match engine. Choose the historical conditions of the
match, combine tournament-specific players from 1970–2022, order a three-player
bench, and face any nation-year participant from the same World Cup span.

## Run locally

```bash
npm install
npm run images:import
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
Era Translation, manager-grade, formation-offer, bench, and historical-opponent
coverage. `opponents:validate` independently checks nation-year counts and sources.

## Product flow

`/` → `/play/era` → `/play/manager` → `/play/formation` →
`/play/draft` (11 starters, 3 substitutes, bench review, opponent selection) →
`/match` → `/result`

`/credits` contains image/data policy and item-level image attribution.

The current archive contains:

- 310 tournament cards across 287 stable player identities
- every men’s World Cup from 1970 through 2022
- 28 manager cards with explicit numeric OFF/DEF grades
- 12 formations, with four deterministic manager/era-aware offers per run
- two permanent, deterministic, player-only respins
- 368 sourced nation-year opponent records across 14 tournaments
- 338 local transparent PNG masters: 4 licensed exact-tournament photos and
  334 clearly labeled original illustrated fallbacks

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
- `scripts/import-player-images.ts`: transparent-image import/build pipeline
- `scripts/import-world-cup-teams.ts`: vendored participant ingestion
- `scripts/validate-data.ts`: executable content and feasibility contract
- `scripts/validate-world-cup-teams.ts`: opponent-count/source validator

The UI and store call pure engine functions. Identical simulation inputs and seed
produce the same event sequence, substitutions, minutes, and result.

## Evidence policy

Ratings, tactical profiles, formations attached to historical opponents, manager
grades, and Era Translation traits are original Trophy XI game estimates—not
official or factual ratings. Tournament statistics are nullable and only populated
with an attached published source; unknown values never become zero. Historical
opponent participant identity, finish, and match count use the vendored Fjelstul
World Cup Database. Manager and lineup fields remain missing until a suitable
record-level source is ingested.

Images never hotlink at runtime. Licensed images require source, author, license,
team/year context, modifications, and a reviewed transparent derivative. Nearby
year imagery can never be labeled as exact-tournament photography.

Trophy XI is unofficial and is not affiliated with or endorsed by FIFA, any
federation, competition, team, manager, or player.
