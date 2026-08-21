# TrophyXI

TrophyXI is a World Cup squad builder and match simulator where you draft players from different eras, build your XI, and see how your team performs against historic World Cup champions.

The current game includes:

- **1,832 tournament cards across 924 unique players**
- World Cup cards spanning **1970 through 2026**
- **15 World Cup champion opponents**
- **47 managers**
- **12 formations**
- Three playable game modes
- Year-specific player ratings, positions, statistics, and artwork

Each card represents a specific tournament version of a player. Messi in 2014 and Messi in 2022 are separate cards with their own ratings, positions, tournament data, and artwork.

**Live site:** [trophyxi.com](https://trophyxi.com/)

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| State | Zustand |
| Storage | AWS S3 |
| Delivery | AWS CloudFront |
| Deployment | Vercel |
| Testing | Vitest, Playwright |

## Features

- Draft players from different World Cup eras
- Build squads using 1,832 tournament-specific player cards
- Choose between 47 managers and 12 formations
- Play matches in different historical eras
- Compare players across generations through Era Translation
- Preview position fit before committing a player
- Validate whether a squad can still be completed before allowing a placement
- Simulate seeded, deterministic matches
- Play against historical World Cup champion squads
- Run a drafted team through a persistent 48-team World Cup
- Search the full playable database through Free Selection
- Save game and tournament progress between sessions
- Resolve player artwork to the exact tournament card
- Track career accolades separately from tournament-specific information

## What Users Can Do

TrophyXI lets users build teams from players who appeared at different World Cups and place them into the same match environment.

A player from 2022 can play in a 1970s match. A player from 1970 can play in the modern game.

Users can:

- Select the era in which the match takes place
- Choose a manager and formation
- Draft players from five-card offers
- Preview every valid position for a selected player
- Compare chemistry before committing a placement
- Use separate respins for players, managers, and formations
- Build 11-player starting XIs with three ordered substitutes
- Search the entire player pool in Free Selection
- Generate deterministic random squads
- Simulate matches against historical champions
- Continue a team through a full World Cup tournament
- Leave and return without losing a saved run

## Game Modes

### Classic Draft

Classic Draft is the main drafting mode.

A run starts with a match era, manager, and formation. Each player round presents five cards to choose from.

Selecting a player does not immediately add him to the squad. The pitch first shows where the card can play and how well he fits each available position.

The player is only committed after a position is selected.

A completed squad contains 11 starters and three ordered substitutes.

Player, manager, and formation offers each have their own respins.

### Free Selection

Free Selection opens the full playable card database.

Instead of choosing from five-card draft offers, users can search for players and construct the squad directly.

There is also a deterministic random squad option that creates a valid team while respecting the selected formation.

### World Cup Run

World Cup Run takes a Classic Draft squad into a persistent 48-team tournament.

The same squad continues through the group stage and knockout rounds rather than being regenerated between matches.

Tournament progress is stored with the rest of the game state so the run can continue across sessions.

## How the Game Works

### Era Translation

The selected era controls the environment of the match. It does not limit which cards can appear.

TrophyXI evaluates how each player translates into that environment using information such as:

- Tournament year
- Player role
- Player archetype
- Formation
- Manager style
- Adaptability
- Demands of the selected era

Historical opponents are evaluated in the same match environment.

I did not want the system to pretend there is one objectively correct answer to how players from different generations compare. Era Translation gives the game one consistent set of rules for handling those comparisons.

### Position Fit

Position fit affects the game rather than only changing what the interface displays.

When a card is selected, the pitch shows which positions are valid and how well the player fits each one.

The same placement penalty used in the preview feeds into squad ratings and match simulation.

The chemistry HUD recalculates the projected value as the user moves between eligible positions. Once the card is placed, the committed chemistry value comes from the same system.

### Squad Validation

The draft continuously checks whether the squad can still be completed.

A placement can be legal by itself while making the rest of the formation impossible to fill.

Before accepting a choice, TrophyXI checks the remaining positions and available placement combinations.

This became important once players could have several eligible positions. Without it, a user could reach the end of a draft with valid cards remaining but no valid way to complete the XI.

### Match Simulation

The match simulator is seeded and deterministic.

Given the same game state and seed, TrophyXI produces the same match.

This includes:

- Event sequence
- Event timing
- Substitutions
- Final result

I wanted deterministic simulation because it makes changes much easier to test.

If a rating, chemistry, or era adjustment causes an unexpected result, I can reproduce the same match instead of debugging against a different random outcome each time.

The simulation logic is kept outside the React components. The interface calls engine functions that handle the underlying calculations.

## Player Data

The playable pool currently contains:

- **1,832 tournament cards**
- **924 unique players**
- World Cup cards from 1970 through 2026
- Tournament-specific ratings
- Tournament-specific positions
- Tournament statistics where verified data is available
- Identity-level career accolades
- Card-specific portraits where artwork is available

A player can have several tournament cards while still belonging to one underlying player identity.

Tournament information stays attached to the individual card, while information such as career accolades can be shared across every playable version of the same player.

The repository also contains historical research records that are separate from the playable pool.

A research record does not automatically become a card that can appear in the game.

### Player Artwork

Portraits are resolved using the exact tournament card ID.

A player's 2014 card does not automatically use artwork from his 2018 card.

If the correct tournament-specific image is unavailable, the game displays `PHOTO PENDING`.

Artwork availability does not determine whether the card can be played.

## Historical Opponents

TrophyXI includes **15 World Cup champion opponents** spanning 1970 through 2026.

The normal opponent pool uses complete champion squads rather than randomly generated teams.

There is also a separate World Cup All-Stars opponent intended to be the hardest matchup in the game while still remaining beatable.

The repository contains a larger historical research archive that stays separate from normal gameplay and is used for data work and validation.

## Managers and Formations

TrophyXI currently includes **47 manager cards** and **12 formations**.

Managers have their own gameplay model covering:

- Offensive approach
- Defensive approach
- Leadership
- Game management
- Era fit

Formation selection determines which positions need to be filled and affects which combinations of players can produce a valid squad.

Manager and formation offers are generated separately from player offers and have their own respins.

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

React components handle presentation and interaction. The engine owns drafting, ratings, chemistry, era translation, squad validation, and simulation.

That separation makes the game systems easier to test without going through the interface and keeps seeded results reproducible.

### State and Persistence

TrophyXI uses Zustand for client-side game state.

Persisted state includes:

- Selected game mode
- Respin counters
- Player placements
- Bench order
- Opponent selection
- Match state
- World Cup Run progress

The store is versioned so older saves can be migrated or repaired when the game state changes.

## Data Pipeline

A large part of TrophyXI happens before player data reaches the interface.

The repository contains scripts for:

- Tournament appearances
- Player identities
- Ratings
- Career information
- Portraits
- Historical opponents

Some of the main generated files include:

```text
src/data/player-tournaments.generated.json
src/data/player-tournaments-2026.generated.json
src/data/player-career.generated.json
src/data/local-portrait-manifest.generated.json
```

The pipeline separates player identity from tournament cards.

This allows several cards to share the correct underlying player without losing the tournament-specific information that makes each version different.

Identity resolution also helps prevent players with similar names from being incorrectly combined.

## Validation and Testing

TrophyXI has automated checks for the playable pool and the data feeding it.

Validation covers:

- Duplicate tournament cards
- Player identity resolution
- Tournament appearances
- Ratings
- Position compatibility
- Portrait resolution
- Career accolades
- Historical opponent completeness
- Formation feasibility
- Squad completion

The project also uses Vitest for application and engine tests and Playwright for end-to-end testing.

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

## The Process

TrophyXI started with a simple question: what would happen if players from different World Cups could be drafted into the same team?

I have always liked the arguments around football all-time XIs almost as much as the teams themselves.

Would a player from 1986 still dominate today? How would a modern player handle a completely different era? Does putting eleven famous names together actually make the best team?

The first version was mostly about drafting cards and simulating a match.

As the player pool grew, the harder part became making the systems underneath those cards agree with each other.

A card needed to belong to the correct player identity, use the right tournament data, resolve the right portrait, fit the correct positions, interact with the selected formation, contribute to chemistry, translate into the selected era, and behave consistently in the simulation.

That led to separating tournament cards from player identities and separating the game engine from the interface.

The data pipeline grew alongside the game. Historical records needed validation before entering the playable pool, artwork needed exact card-level resolution, and squad construction needed to account for whether future positions could still be filled.

The simulator also moved toward deterministic results so changes to ratings and game logic could be reproduced and tested.

World Cup Run added another layer because the squad, tournament bracket, match state, and progress now had to survive between sessions and across changes to the store.

Most of the project has grown this way. A feature usually starts as something visible in the game and ends up requiring changes to several systems underneath it.

## What I Learned

TrophyXI is the project where I have spent the most time thinking about how different parts of an application affect each other.

Adding another player is easy.

Making sure that player's tournament card belongs to the right identity, his positions work with the formation system, his portrait belongs to the correct year, his data passes validation, his chemistry is calculated consistently, and his ratings feed correctly into the simulation is a different problem.

I learned a lot about:

- Separating game logic from UI code
- Designing deterministic systems
- Managing larger structured datasets
- Resolving identities across inconsistent historical data
- Writing validation around generated data
- Modeling relationships between cards, players, formations, managers, and eras
- Persisting and migrating client-side state
- Designing systems where several independent rules need to agree
- Testing game logic without depending on the interface
- Treating historical research data and playable game data as separate things

The part I have enjoyed most is that the visible product is a football game, but most of the work happens underneath it.

A draft only feels simple when the data, validation, placement rules, chemistry, state, and simulation all agree.

## How to Run the Project

### Requirements

- Node.js
- npm
- Chromium for Playwright end-to-end tests

### Install Dependencies

```bash
npm install
```

### Generate Player and Opponent Data

```bash
npm run players:generate:fbref-map
npm run players:normalize:careers
npm run opponents:import
```

### Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Run Tests

```bash
npm test
```

For Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

### Run Validation

```bash
npm run validate:data
npm run players:validate:2026
npm run players:validate:archive
npm run opponents:validate
```

### Production Build

```bash
npm run build
```

## Video

