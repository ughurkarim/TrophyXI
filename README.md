# Trophy XI

Trophy XI is an original browser-based historical football drafting game with a
deterministic knockout-match engine. Build an era-specific XI from tournament
versions, appoint a manager, choose the draft order directly on the pitch, and
challenge Spain 2010.

## Run locally

```bash
npm install
npm run images:import
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run validate:data
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`validate:data` reports the exact archive, identity, role, manager, tournament,
confederation, image, attribution, and draft-feasibility counts.

## Product flow

`/` → `/play/era` → `/play/manager` → `/play/formation` →
`/play/draft` → `/match` → `/result`

`/credits` contains the public image/data policy and item-level attribution.

The selectable archive contains:

- 240 player cards across 228 stable player identities
- 28 goalkeepers, 70 defenders, 75 midfielders, and 67 attackers
- every men’s World Cup from 1998 through 2022
- all six confederations, including five OFC tournament cards
- 28 manager cards across 22 manager identities
- six card-quality bands from `iconic` to `limited`

## Architecture

- `src/data`: typed player, manager, formation, champion, era, and image manifests
- `src/engine`: pure seeded draft, fit, chemistry, rating, and simulation logic
- `src/store`: versioned Zustand persistence, migration, and hydration repair
- `src/components`: feature-oriented presentation and accessible interactions
- `src/app`: Next.js App Router pages
- `scripts/import-player-images.ts`: local transparent-image import/build pipeline
- `scripts/validate-data.ts`: executable content and feasibility contract

The page and store layers call pure engine functions. A future server adapter can
replace match simulation without rewriting the UI.

## Evidence policy

Ratings and attributes are original Trophy XI simulation estimates, not official
ratings or factual career measurements. Tournament statistics are nullable and
only populated with a card-level published source; unknown values never become
zero. Named achievements likewise require a source.

Images are local PNG masters. This build contains four licensed tournament
photographs and 264 clearly labeled original illustrated fallbacks. See
`IMAGE_SOURCES.md` and `DATA_SOURCES.md`.

Trophy XI is unofficial and is not affiliated with or endorsed by FIFA, any
federation, competition, team, manager, or player.
