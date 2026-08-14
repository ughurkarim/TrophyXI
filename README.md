# Trophy XI

**Build the XI. Beat history.**

Trophy XI is a World Cup squad-building and match simulation game built with Next.js, React, and TypeScript.

Draft tournament-specific versions of players from 1970–2026, choose a manager and formation, build an XI with three substitutes, and see how your team performs against historic World Cup champions or through a full World Cup run.

**Live:** https://trophyxi.com/

---

## Overview

Trophy XI is built around a simple idea: the best eleven names do not always make the best team.

Players are tied to specific World Cup tournaments instead of receiving one rating for their entire careers. A player's 2014 card and 2022 card are separate versions with different ratings, roles, positions, tournament context, and data.

From there, the game evaluates how the squad actually fits together through position fit, chemistry, formation, manager style, era, bench depth, and match state.

The current archive contains:

- **9,627 tournament cards**
- **7,255 player identities**
- Men's World Cups from **1970–2026**
- **47 tournament manager cards**
- **12 formations**
- **15 World Cup champion opponents**
- A separate World Cup All-Stars challenge opponent

---

## Game Modes

### Classic Draft

Classic Draft is the main Trophy XI experience.

You:

1. Choose the era the match will be played in
2. Draft a manager from three options
3. Choose from four manager- and era-aware formations
4. Draft players through five-card offers
5. Place each player into an eligible position
6. Build an XI and three-player bench
7. Choose a World Cup champion
8. Simulate the match

Manager, formation, and player respins are handled separately, so using one does not remove the others.

Player offers also track previously shown identities and cards to keep drafts from repeatedly showing the same players.

### Free Selection

Free Selection lets you build exactly the team you want.

The full player archive is searchable and filterable, so you can choose specific tournament versions, managers, and formations without relying on draft offers.

There is also a seeded squad generator that can automatically build a valid team.

### World Cup Run

World Cup Run takes the squad-building system into a full **48-team tournament**.

You keep the same drafted squad while progressing through:

- Group stage
- Knockout rounds
- Quarterfinals
- Semifinals
- World Cup Final

CPU fixtures are simulated alongside the user's matches, and tournament progress is persisted between sessions.

---

## Tournament-Specific Players

Trophy XI does not treat a player as one career-wide card.

For example:

```text
Lionel Messi — 2014
Lionel Messi — 2018
Lionel Messi — 2022
Lionel Messi — 2026
```

These are separate cards.

Each version can have its own:

- Overall rating
- Positions
- Role
- Tournament performance
- Career context
- Accolades
- Statistics
- Portrait

This makes drafting more interesting than simply searching for the biggest names.

A player's tournament version matters.

---

## Drafting and Position Fit

Choosing a player is only the first part of a draft decision.

Each player round presents five unique identities. After selecting a card, Trophy XI previews where that player can fit in the current formation before committing the placement.

Position fit is shown through different states, from natural positions to poor or incompatible placements.

Those decisions are not only visual. The same position-fit logic feeds into team ratings and the match simulation.

The draft engine also checks whether a placement would make it impossible to finish the formation. If a move would leave the squad with no valid completion path, it is blocked.

Squad construction considers:

- Player quality
- Position fit
- Formation balance
- Chemistry
- Manager compatibility
- Era adaptability
- Player relationships
- Bench coverage
- Tournament performance
- Career legacy

The goal is to reward building a team rather than simply collecting the highest-rated cards.

---

## Match Simulation

Trophy XI uses a seeded TypeScript match simulation engine.

The engine models more than an overall team rating. Match outcomes are influenced by:

- Attack
- Midfield
- Defense
- Position fit
- Chemistry
- Formation
- Manager style
- Match era
- Player roles
- Fatigue
- Bench quality
- Cards
- Score state
- Tactical changes
- Chance creation
- Finishing
- Substitutions

A better team should have an advantage, but it should not automatically win.

Football is unpredictable, so the simulation keeps randomness while still making squad-building decisions matter.

### Seeded Simulation

Match randomness is reproducible.

Given the same teams, match settings, and seed, the simulation produces the same event sequence and result.

That makes unusual outcomes reproducible instead of impossible to debug.

Changing the seed produces a different match without changing the underlying team.

---

## Match State

The simulation continues to react as the match changes.

A team chasing a goal late in the second half should not behave exactly like the same team protecting a lead.

Match state includes information such as:

- Score
- Match time
- Chances
- Shots
- Cards
- Fatigue
- Substitutions
- Tactical situation

These values influence later events in the simulation rather than deciding the entire result before kickoff.

---

## Era Translation

The selected era is the **environment where the match takes place**, not a filter on which players can be drafted.

A 2022 player can play in a 1970s environment, and a 1970 player can be placed into the modern game.

Trophy XI's Era Translation system evaluates that move using factors including:

- Tournament year
- Distance between eras
- Direction of the era change
- Position
- Player role
- Archetype
- Formation
- Manager style
- Adaptability
- Player attributes
- Demands of the selected era

The same model is applied to historical opponents.

This lets teams from different generations meet without simply giving every older or newer player the same generic adjustment.

---

## Managers and Formations

Managers are tournament-specific as well.

The archive currently contains **47 manager cards**, with ratings for areas including:

- Offense
- Defense
- Leadership
- Game management
- Era fit

Manager selection affects formation options, chemistry, team ratings, and match behavior.

Trophy XI currently supports **12 formations**.

Formation offers are generated from the manager, match era, seed, and draft history instead of presenting the same choices every time.

---

## Historical Opponents

A completed squad can be tested against World Cup champions from every tournament in the playable era range.

Normal opponent selection contains **15 champion teams from 1970–2026**.

These are modeled as full opponents rather than a single overall number.

Trophy XI also includes a separate **World Cup All-Stars** opponent as a high-difficulty challenge.

World Cup Run uses a larger tournament field built from active historical teams and Trophy XI opponent models.

---

## Historical Data

A large part of Trophy XI is the data behind the game.

The repository includes generation, normalization, and validation tooling for:

- Player identities
- Tournament appearances
- 2026 rosters
- Career data
- Tournament statistics
- Player ratings
- Accolades
- Managers
- Formations
- Historical opponents
- Player portraits

The validation pipeline checks for problems including:

- Duplicate player identities
- Duplicate tournament cards
- Invalid tournament appearances
- Position and role errors
- Missing data
- Rating limits
- Formation feasibility
- Bench coverage
- Manager data
- Missing or mismatched portraits
- Historical opponent completeness
- Accolade consistency

This became increasingly important as the archive grew into thousands of tournament cards.

---

## Player Images

Player portraits are tied to exact tournament-card IDs.

```text
public/players/game-faces/{player-card-id}.png
```

For example:

```text
lionel-messi-2014.png
lionel-messi-2022.png
cristiano-ronaldo-2006.png
cristiano-ronaldo-2018.png
```

A portrait from one World Cup is not silently reused for another tournament version.

If the exact image is unavailable, the player remains playable and receives a `PHOTO PENDING` placeholder instead.

Artwork availability never determines whether a player can be drafted.

---

## Internationalization

Trophy XI currently supports eight languages:

- English
- Spanish
- Portuguese
- Arabic
- French
- Russian
- German
- Italian

Localization is built with `next-intl`.

The app can detect the browser language, remember the user's selected locale, and fall back to English when a translation is unavailable.

Arabic also uses right-to-left layout support.

The repository includes scripts for validating translations and auditing untranslated source strings.

---

## Architecture

The main application is separated into data, engine, state, and presentation layers.

```text
src/
├── app/          Next.js App Router pages
├── components/   Game and UI components
├── data/         Players, managers, formations, eras, images, opponents
├── engine/       Drafting, ratings, Era Translation, tournament and match logic
├── i18n/         Localization configuration
├── store/        Zustand game state and persistence
└── types/        Shared TypeScript types

scripts/
├── Player and tournament generation
├── Career-data normalization
├── Historical roster imports
├── Portrait auditing
├── Opponent imports
├── Data validation
└── Localization validation
```

The UI and store call into reusable engine functions for drafting, position fit, team ratings, Era Translation, tournament progression, and match simulation.

Game state is persisted with Zustand and includes migration and repair logic so older saves can be safely updated when the game model changes.

---

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- next-intl

### Testing

- Vitest
- React Testing Library
- Playwright

### Infrastructure and Tooling

- Vercel
- AWS S3
- AWS CloudFront
- Cloudflare
- Sentry
- Vercel Analytics
- Vercel Speed Insights
- ESLint
- TypeScript

---

## Asset Delivery

Trophy XI uses a separate asset pipeline for player and tournament imagery.

```text
Trophy XI
    |
    v
AWS S3
    |
    v
CloudFront
    |
    v
Player and tournament assets
```

The application is deployed through Vercel while larger image assets can be delivered through the CDN-backed asset domain.

Separating image availability from gameplay also means a missing image does not remove a player from the game.

---

## Testing and Validation

Trophy XI includes unit, integration, data-validation, and end-to-end testing.

Tests cover areas including:

- Draft generation
- Player-offer behavior
- Position fit
- Squad feasibility
- Chemistry
- Team ratings
- Era Translation
- Seeded simulation
- Match outcomes
- Substitutions
- Tournament progression
- World Cup Run
- Player identities
- Historical data
- Managers
- Formations
- Images
- Localization
- UI flows

The project also has dedicated validation scripts for the historical archive so bad data can be caught before it reaches gameplay.

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/ughurkarim/TrophyXI.git
cd TrophyXI
```

Install dependencies:

```bash
npm install
```

Prepare the generated data:

```bash
npm run players:generate:fbref-map
npm run players:normalize:careers
npm run opponents:import
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Useful Commands

### Development

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

### Tests

```bash
npm test
npm run test:e2e
```

### Localization

```bash
npm run i18n:validate
npm run i18n:audit
```

### Player Data

```bash
npm run players:validate:2026
npm run players:validate:archive
npm run players:validate:playable
npm run players:validate:accolades
```

### Images

```bash
npm run images:validate:game-faces
```

### Historical Opponents

```bash
npm run opponents:validate
```

### Full Data Validation

```bash
npm run validate:data
```

---

## Why I Built It

The idea for Trophy XI came from watching a YouTuber I have followed since middle school play a similar basketball draft game.

It immediately reminded me of why I loved FIFA 15 when I was younger: the player cards, building teams, comparing players, and the feeling that every new squad could turn out completely differently.

I wanted to go back to that part of my childhood and build my own version of that experience around football and the World Cup.

I wanted different tournament versions of the same player to actually matter. I wanted managers, positions, chemistry, eras, and the bench to matter. And if two teams played a match, I wanted the result to feel unpredictable without feeling random.

Trophy XI ended up becoming both a game I would have wanted to play growing up and a project where I could work on things I wanted to get better at: simulation, large historical datasets, validation, testing, frontend design, and production infrastructure.

The idea is still the same:

**Build the XI. Beat history.**

---

## Disclaimer

Trophy XI is an independent fan project created for educational and entertainment purposes. It is not affiliated with or endorsed by FIFA, EA Sports, or any football governing body.
