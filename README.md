# TrophyXI

TrophyXI is a World Cup squad builder and match simulator where you draft players from different eras, build your XI, and see how your team performs against historic World Cup champions.

The playable pool currently contains **1,832 tournament cards across 924 unique players**, with cards spanning World Cups from 1970 through 2026.

Each card represents a specific tournament version of a player. Messi in 2014 and Messi in 2022 are separate cards with their own ratings, positions, tournament stats, and artwork.

**Live site:** [trophyxi.com](https://trophyxi.com/)

## The idea

I have always liked the arguments around football all-time XIs almost as much as the teams themselves.

Would a player from 1986 still dominate today? How would a modern player handle a completely different era? Does putting eleven famous names together actually make the best team?

TrophyXI started as a way to turn those questions into something playable.

You choose the environment of the match, draft players from different World Cups, pick a manager and formation, then see how the squad performs together.

As the project grew, the interesting part became everything underneath the cards. Player identity, historical data, position compatibility, chemistry, era translation, squad validation, persistent tournaments, and deterministic simulation all became part of making the game work.

## Game modes

### Classic Draft

Classic Draft is the main drafting mode.

A run starts with a match era, manager, and formation. Each player round then presents five cards to choose from.

Selecting a player does not immediately add him to the squad. It first shows where that card can fit in the current formation. The player is only committed after choosing a position on the pitch.

The squad contains 11 starters and three ordered substitutes.

Classic Draft also has independent respins for players, managers, and formations.

### Free Selection

Free Selection opens the full playable card database.

Instead of drafting from five-card offers, you can search through the available players and construct a squad directly.

There is also a deterministic random squad option that creates a valid team without breaking the selected formation.

### World Cup Run

World Cup Run takes a Classic Draft squad into a persistent 48-team tournament.

The same team continues through the group stage and knockout rounds rather than being regenerated between matches.

Tournament progress is stored with the rest of the game state so a run can continue across sessions.

## Playing across eras

The selected era controls the environment of the match. It does not limit which cards can appear.

A player from 2022 can play in a 1970s match environment. A player from 1970 can play in the modern game.

TrophyXI handles this through an Era Translation system.

The model evaluates how a card translates into the selected environment using tournament year, player role, archetype, formation, manager style, adaptability, and the demands of the era.

Historical opponents are evaluated under the same match environment.

The goal is not to claim there is one objectively correct answer to how players from different generations compare. The system gives the game a consistent set of rules for making those comparisons.

## Player database

The current playable pool contains:

- **1,832 tournament cards**
- **924 unique players**
- World Cup cards spanning 1970 through 2026
- year-specific ratings and positions
- tournament statistics where verified data is available
- identity-level career accolades
- exact card-specific portraits where artwork is available

A player can have multiple tournament cards while still belonging to one underlying identity.

Tournament-specific information stays attached to the individual card while information such as career accolades can be shared across every playable version of the same player.

The repository also contains historical research data that is separate from the playable pool. Research records do not automatically become cards that can appear in a draft.

## Player artwork

Portraits are resolved using the exact tournament card ID.

A 2014 card does not silently borrow the portrait from the same player's 2018 card.

When the correct year-specific artwork is unavailable, the game displays a `PHOTO PENDING` state instead.

Artwork availability does not determine whether a player is eligible to play.

## Position fit

Position fit is part of the game logic rather than just a UI hint.

When a card is selected, the pitch shows which positions are valid and how well the player fits each one.

The same placement penalty used in the preview feeds into the squad ratings and simulation.

The chemistry HUD also previews the result before placement. Moving between eligible positions recalculates the projected value for the exact slot being considered.

Once the card is placed, the committed chemistry value is calculated from the same system.

## Squad validation

The draft continuously checks whether the squad can still be completed.

A placement can be individually legal but still create an impossible formation later. TrophyXI checks the remaining positions before allowing choices that would leave no valid completion path.

This became especially important once players could have several eligible positions.

The validator prevents the draft from reaching a state where the user has valid cards left but no possible way to finish the XI.

## Match simulation

The simulation is seeded and deterministic.

Given the same game state and seed, TrophyXI produces the same match.

That includes the event sequence, substitutions, timing, and final result.

I wanted this behavior because it makes the simulation much easier to test. If a rating or chemistry change produces an unexpected match, I can reproduce the same situation instead of debugging against a different random result every time.

The UI does not contain the simulation logic itself. Game components call pure engine functions that handle the underlying calculations.

## Historical opponents

TrophyXI includes **15 World Cup champion opponents** spanning 1970 through 2026.

The normal opponent pool uses complete champion squads rather than randomly generated teams.

There is also a separate World Cup All-Stars opponent designed to be the hardest matchup in the game while still remaining beatable.

The project contains a larger historical research archive as well. That archive is kept separate from normal gameplay and is used for historical data work and validation.

## Managers and formations

TrophyXI currently includes **47 manager cards** and **12 formations**.

Managers have their own gameplay model covering offensive approach, defensive approach, leadership, game management, and fit with the selected era.

Formation selection determines which positions need to be filled and affects which player combinations can produce a valid squad.

Manager and formation offers are generated independently from player offers and have their own respins.

## Architecture

TrophyXI is a Next.js application written primarily in TypeScript.

```text
src/
├── app/          Next.js routes and pages
├── components/   Game and UI components
├── data/         Players, managers, formations, eras, images, opponents
├── engine/       Drafting, chemistry, ratings, era translation, simulation
└── store/        Zustand state, persistence, migrations, hydration repair
```

The game engine is kept separate from the interface.

React components handle presentation and interaction while the engine owns drafting, ratings, chemistry, era translation, and simulation logic.

This makes the game systems easier to test independently from the UI and keeps seeded results reproducible.

## State and persistence

TrophyXI uses Zustand for client-side game state.

Persisted state includes the selected mode, respin counters, player placements, bench order, opponent selection, match state, and World Cup Run progress.

The store is versioned so older saved games can be migrated or repaired when the structure of the game changes.

## Data pipeline

A large part of TrophyXI happens before the data reaches the interface.

The project contains scripts for tournament appearances, player identities, ratings, career information, portraits, and historical opponents.

Some of the main generated files include:

```text
src/data/player-tournaments.generated.json
src/data/player-tournaments-2026.generated.json
src/data/player-career.generated.json
src/data/local-portrait-manifest.generated.json
```

The pipeline separates a player's identity from his individual tournament cards.

This lets multiple cards share the correct player identity without losing the tournament-specific information that makes each version different.

Identity resolution also helps prevent players with similar names from being incorrectly combined.

## Validation

TrophyXI has automated validation for the playable pool and the data feeding it.

The checks cover duplicate cards, player identities, tournament appearances, ratings, position compatibility, portrait resolution, career accolades, historical opponent completeness, formation feasibility, and squad completion.

Run the main validation and test suite with:

```bash
npm run validate:data
npm run players:validate:2026
npm run players:validate:archive
npm run opponents:validate
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The player archive validator also writes a detailed audit to:

```text
reports/player-archive-validation.json
```

## Run locally

Install dependencies:

```bash
npm install
```

Generate the required player and opponent data:

```bash
npm run players:generate:fbref-map
npm run players:normalize:careers
npm run opponents:import
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

For Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| State | Zustand |
| Storage | AWS S3 |
| Delivery | AWS CloudFront |
| Deployment | Vercel |
| Testing | Vitest, Playwright |

## What I learned

TrophyXI started as a football side project, but it ended up being the project where I have spent the most time thinking about how different systems affect each other.

Adding another player is easy. Making sure that player's tournament data belongs to the right identity, his positions work with the formation system, his card behaves correctly in the draft, his image resolves to the right year, and his ratings feed consistently into the simulation is a much more interesting problem.

The project has grown through a lot of iteration, especially around data quality and the separation between historical research data and what actually enters gameplay.

That has probably been my favorite part of working on it. The visible product is a football game, but most of the work is making sure everything underneath it agrees.
