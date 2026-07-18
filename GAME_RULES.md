# Trophy XI game rules

## Session flow

Choose one match environment, draft one of exactly three tournament-manager
versions, choose one of four seeded formations, fill eleven formation slots in
any user-selected order, draft three substitutes, reorder Bench 1–3, choose a
historical opponent, and play a deterministic knockout match.

The user selects an open tactical slot before seeing exactly three valid starter
cards. A filled slot can be inspected but never replaced. Bench cards are chosen
from three identity-safe, tactically varied options and then assigned to an open
bench slot.

## Match environment versus card year

Match environments are 1970s, 1980s, 1990s, 2000s, 2010s, 2020s, and All
Eras / Neutral. The environment is not a player-card filter: every supported
tournament version remains eligible in every environment.

`tournamentYear` is the represented card performance. `eraId` is the match
environment. Era Translation measures how the former translates into the latter.
Both Trophy XI and its nation-year opponent are evaluated in the same environment.

## Trophy XI Era Translation Rating

Every player has a project-created translation profile:

- timelessness
- physical, technical, and tactical adaptability
- pressing and tempo adaptability
- equipment and refereeing adaptability

The model combines year distance, direction of travel, those attributes,
environmental demands, role/archetype, manager style, and formation pressing.
Modern-to-old translation emphasizes physical contact, equipment, refereeing, and
technical control. Old-to-modern translation emphasizes pressing, tactical,
tempo, and technical adaptation.

Era legacy sets a bounded distance multiplier and floor:

- era-specialist: full distance penalty, minimum 58
- adaptable: 72% distance multiplier, minimum 68
- cross-era: 44% distance multiplier, minimum 80
- timeless: 18% distance multiplier, minimum 90

All Eras / Neutral returns 94–100 and minimizes year distance. “Timeless” is an
original Trophy XI game-design evaluation, not an objective historical claim.

## Identity integrity

Every card has a version id and a stable `playerIdentityId`. One identity can
appear only once across all eleven starters and all three substitutes; alternate
tournament versions count as the same identity. Known opponent lineup identities
are rejected at opponent selection, hydration, pre-match validation, and
simulation. Missing opponent lineups are never invented.

## Position and manager fit

Position Fit uses:

- 100 exact primary
- 94 strong role family
- 88 declared secondary
- 80 adjacent accepted
- 68 emergency accepted
- 0 invalid

Managers have a tactical style, preferred and acceptable formations, leadership,
game management, and separate numeric OFF and DEF grades. Letter grades map from
S (95–100) through F (below 55). OFF influences chance quality and attacking
changes; DEF influences opponent chance quality and lead protection.

## Formations

The library contains 12 formations. Each run offers exactly four deterministic
choices derived from draft seed, manager, and environment. Offers include a
manager-preferred shape, a balanced option, a contrasting shape, and an
era-aware/wildcard option when valid. Formation selection has no respin.

## Bench priority and substitutions

Bench order has simulation meaning:

- Bench 1: highest use probability, normally 50’–70’, expected 25–40 minutes
- Bench 2: medium priority, normally 65’–80’, expected 12–28 minutes
- Bench 3: lowest priority, normally 75’–90’, expected 3–18 minutes

These are tendencies. Score state, manager game management, OFF/DEF grades,
position compatibility, player type, fatigue window, extra time, and seeded
randomness decide actual use. When losing, attacking options and earlier changes
are favored; when winning, protective options receive more weight. Results show
all fourteen players, unused substitutes at zero minutes, and the substitution
timeline with reason, new position, bench priority, and manager influence.

## Player respins

Every session starts with exactly two player respins. A respin replaces all three
cards in the current starter or bench draw, preserves the selected slot/round,
permanently consumes one use, persists after refresh, and rejects displayed
identities when at least three alternatives remain. A third use is ignored.
Manager, formation, era, and opponent selection cannot consume player respins.

## Ratings and deterministic simulation

Pre-match ratings include attack, midfield, defense, goalkeeper contribution,
bench depth, bench versatility, Position Fit, Era Fit, timelessness, chemistry,
tactical balance, manager OFF/DEF, and overall. Bench 1/2/3 contribute with
approximately 40%/25%/15% priority weights and remain subordinate to starter
quality.

Simulation priority is:

1. tournament-specific player quality
2. positional fit
3. tactical balance
4. chemistry
5. manager OFF/DEF
6. bidirectional Era Translation
7. ordered bench and substitutions
8. tournament experience
9. capped sourced achievements
10. bounded seeded randomness

Ties after 90 minutes go to extra time and then a deterministic shootout. The
result includes goals, assists, cards, manager events, substitutions, minutes,
possession, shots, xG, tactical impact, and player of the match.

## Historical opponents

Each tournament participant from 1970–2022 is a distinct nation-year opponent.
Search and filters cover year, nation, finish, confederation, difficulty, and
champions. Participant identity, finish, and match count are sourced facts.
Ratings, tactical labels, difficulty, and formation are explicitly marked Trophy
XI models. Missing managers, lineups, and detailed statistics display as not
sourced rather than zero or invented data.
