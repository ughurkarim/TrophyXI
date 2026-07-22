# Trophy XI

Trophy XI is a browser-based historical football squad builder with deterministic
single-match and tournament simulation. Build a team from tournament-specific
players spanning 1970–2026, order a three-player bench, and face one of 14 World
Cup champions or the featured World Cup All-Stars.

## Run locally

```bash
npm install
npm run players:normalize:careers
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

`validate:data` reports archive, identity, role, tournament, image,
status-tier, rating-cap, weighted-offer, Era Translation, manager-grade,
formation-offer, bench, flag, chemistry-preview, and historical-opponent coverage.
`opponents:validate` independently checks champion roster completeness and the
research archive.

## Product flow

`/` → mode choice and confirmation → match era → manager → formation → squad
construction → opponent or tournament fixture → match broadcast → result

Classic Draft retains the five-card player-first flow, independent manager,
formation, and player respins, 11 starters, and three ordered substitutes. Free
Selection opens the full searchable card archive and supports a deterministic
valid-squad randomizer. World Cup Run uses the Classic Draft squad inside a
persistent 32-team group and knockout tournament.

Every player round presents five unique identities. Selecting a card only opens
the Position Fit preview; a second click on an eligible pitch slot commits the
placement. Green, yellow, red, and incompatible states show exact fit and the
same placement penalty used by team ratings and simulation. A completion-path
validator prevents a placement or offer from making the formation impossible.
The top-right Chemistry HUD always shows the committed value; after card
selection it shows the production-engine projection for the best legal slot, then
recalculates for the exact slot under pointer or keyboard focus. The committed
result must equal the final preview.

The current archive contains:

- 1,376 tournament cards across 676 stable player identities
- all player cards are draft eligible; artwork availability never changes
  card eligibility, and neutral identity markers cover cards without portraits
- identity-level historical and user-supplied portraits fill missing card
  views from the closest available portrait
- every men’s World Cup from 1970 through the completed 2026 archive
- 47 manager cards across 47 identities with OFF, DEF, Leadership, Game
  Management, and selected-era Manager Era Fit
- all audited manager cards are draft eligible
- three deterministic, identity-safe manager choices per offer
- 12 formations, with four deterministic manager/era-aware offers per run
- one separate, deterministic, permanent Manager Respin
- one separate, deterministic Formation Respin
- five-card, player-first drafting with two-click placement
- two permanent, deterministic, player-only respins
- three ordered bench places drafted from five-card options
- 14 complete champion opponents from 1970–2022 in normal selection
- identity-safe active champions and explicit Trophy XI models fill World Cup
  Run; the separate 416-team research archive never enters generation or play
- World Cup All-Stars: a deterministic, beatable Mythic opponent

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
- `src/data/local-portrait-manifest.generated.json`: source-neutral local portrait manifest
- `src/data/player-tournaments.generated.json`: verified tournament-appearance archive
- `src/data/player-career.generated.json`: normalized career-data output
- `scripts/generate-player-tournament-data.ts`: World Cup appearance-card generator
- `scripts/normalize-local-career-archive.ts`: career and tournament-accolade normalizer
- `scripts/import-player-identity-portraits.ts`: source-neutral missing-portrait importer
- `scripts/import-world-cup-teams.ts`: vendored participant ingestion
- `scripts/validate-data.ts`: executable content and feasibility contract
- `scripts/validate-world-cup-teams.ts`: opponent-count/evidence validator

The UI and store call pure engine functions. Identical simulation inputs and seed
produce the same event sequence, substitutions, minutes, and result. Version-8
Zustand persistence stores the selected mode, all three independent respin
counters, draft visibility memory, placements, bench order, opponent selection,
match state, and World Cup Run progress. Older saves are migrated or repaired at
hydration boundaries.
