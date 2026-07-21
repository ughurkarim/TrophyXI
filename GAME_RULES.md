# Trophy XI game rules

## Session flow

Highlight and explicitly confirm Classic Draft, Free Selection, or World Cup
Run, then choose a match environment, manager, formation, eleven starters, and
three ordered substitutes.
Classic Draft ends in one deterministic match against a champion or World Cup
All-Stars. World Cup Run carries the drafted squad through a persistent 32-team
group and knockout tournament. Free Selection opens the complete eligible
archive without five-card offers.

Manager selection is a separate confirmation step. In Classic Draft and World
Cup Run, selecting one of three cards highlights it without advancing. The
manager may change within that visible set until Continue permanently locks the
choice and opens formation selection. Free Selection makes every eligible
manager searchable.

Starter drafting is player first. The first click selects one of five
identity-safe tournament cards without changing the XI. Every open tactical slot
then previews Position Fit and the exact engine penalty. A second click on an
eligible, feasibility-safe slot commits the player; selection can be canceled
without changing the five-card offer. A filled slot can be inspected but never
replaced. Bench rounds also offer five cards, followed by assignment to an open
priority slot.

The compact Squad Archive preserves manager, formation-slot, and Bench 1/2/3
order. Filled entries are inspectable and never replace or reorder a pick.

## Active archive and status tiers

The typed active archive contains 629 player cards across 287 stable identities
and 49 manager cards across 39 stable identities. Every player card represents an
actual match appearance in one supported men's World Cup from 1970 through 2026.
The two live 2026 versions are current verified snapshots: incomplete totals stay
null and neither card claims an unfinished tournament award or champion status.
Drafting, hydration repair, and play all use the explicit active boundary; image
availability never changes card eligibility.

Player overalls use the full 65–99 scale. A 99 is reserved for the smallest
greatest-tournament cohort, Golden Ball versions are normally at least 96, every
identity's tournament versions have distinct ratings, and validation preserves a
broad lower-card cohort. Status tiers use non-overlapping content bands:

- legend: 98–99
- icon: 94–97
- elite: 90–93
- standout: 85–89
- reliable: 80–84
- role-player: 74–79
- limited: 65–73

Status and every numeric attribute remain project-created estimates.

## Manager metrics

Manager cards show exactly OFF, DEF, Leadership, Game Management, and Manager
Era Fit. Era Fit is recalculated for the selected match environment from the
manager card's tournament year, tactical demands, adaptability, and formation
breadth. Neutral reduces distance pressure without granting an automatic 100.
The score modestly informs formation offers, tactical compatibility, Chemistry,
simulation, and manager effectiveness without overpowering the players.

Manager grades use S at 95–100, A+ at 92–94, A at 88–91, A− at 84–87, B+ at
80–83, B at 75–79, B− at 70–74, C+ at 65–69, C at 60–64, D at 50–59, and F
below 50. Exceptional manager metrics may earn S while lower and specialist
profiles remain in the pool.

## Match environment versus card year

Match environments display newest first: 2020s, 2010s, 2000s, 1990s, 1980s,
1970s, and Neutral / All Eras. The environment is not a player-card filter:
every supported tournament version remains eligible in every environment.

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

## Player-first placement and Position Fit

Position Fit uses:

- 100 exact primary
- 94 strong role family
- 88 declared secondary
- 80 adjacent accepted
- 72 accepted through an eligible alternate
- 64 same outfield band
- 56 adjacent outfield band
- 48 distant outfield band
- 0 goalkeeper/outfield incompatible

Fit state is green at 90–100, yellow at 70–89, red at 45–69, and incompatible
below 45. Every state has a visible text label; yellow and red also show the exact
negative percentage. Goalkeepers cannot play outfield and outfield cards cannot
play in goal.

The single displayed-and-simulated penalty formula is piecewise and rounded to
the nearest integer:

- green: `round((100 − fit) / 10 × 3)`, producing 0–3%
- yellow: `4 + round((89 − fit) / 19 × 7)`, producing 4–11%
- red: `12 + round((69 − fit) / 24 × 13)`, producing 12–25%

The penalty is deterministic, monotonic, and capped at 25%. Team-rating inputs
for that starter are multiplied by `(100 − penalty) / 100`; the simulator uses
those same team ratings. The Chemistry HUD always shows current committed
Chemistry. Selecting a card adds projected Chemistry, signed change, and projected
OVR using the same `calculateTeamRatings` production path as commit. The initial
value uses the best legal slot; pointer hover or keyboard focus recalculates for
that exact open slot. The value committed by a click must equal the final
exact-slot preview. Placement feedback reports the card year, slot, fit, penalty,
Era Translation, manager fit, chemistry change, and overall change.

Before placement, the engine checks whether every remaining slot still has a
unique available identity. This is a maximum bipartite-matching feasibility
contract specialized to the current two compatibility components—goalkeeper and
outfield. Unsafe placements are disabled, and every five-card starter offer must
contain at least one placement that preserves a completion path. Generation also
weights late positional needs while preserving tactical-family variety.

Every five-card set has five unique card ids and five unique
`playerIdentityId`s. Drafted, benched, opponent, rejected-respin, corrupted, and
alternate-version duplicate identities are excluded at the appropriate boundary.

Managers have a tactical style, preferred and acceptable formations, leadership,
game management, and separate numeric OFF and DEF grades. Letter grades map from
S (95–100) through F (below 55). OFF influences chance quality and attacking
changes; DEF influences opponent chance quality and lead protection. Across the
20 active OFF/DEF grades, S is capped at 5%, S/A+ stays below 15%, at least 40%
are B-range, and at least one is C-range.

## Deterministic offer weighting

Starter offers target status tiers with weights of 2% legend, 6.5% icon, 14.5%
elite, 25.5% standout, 27% reliable, 18.5% role-player, and 6% limited. The
draft-wide seeded high-card budget yields zero 90+ cards in most five-card
offers, otherwise one, with a hard maximum of two. No offer may contain more than
two legend/icon cards.

Bench offers are independently weighted at 0.25% legend, 1.75% icon, 7.5%
elite, 20% standout, 33.5% reliable, 28% role-player, and 9% limited. A bench
offer has at most one 90+ card, at most two 86+ cards, at least two cards below
82, at least one below 78, and tactical specialist/versatility coverage. Across
the chosen three-player bench, at least two cards remain below 82 and at least
one below 78. All sampling is deterministic and still obeys identity,
opponent-exclusion, feasibility, and positional-need boundaries.

The store counts identities shown during the current run and keeps a short
recent-history window across new runs. Unseen identities are preferred when
valid alternatives exist; recently seen identities are de-prioritized; identities
rejected by a respin are excluded when the pool permits. Drafted identities and
every alternate tournament version remain fully excluded.

## Modeled tags and verified accolades

Player Tag Effects describe capped Trophy XI engine behavior and never masquerade
as historical honors. Career Accolades are a separate list; every named item
requires verified card-level evidence. Manager modeled tags and manager
accolades follow the same boundary. Unknown facts remain absent rather than
becoming generic achievements.

## Formations

The library contains 12 formations. Each run offers exactly four deterministic
choices derived from draft seed, manager, and environment. Offers include a
manager-preferred shape, a balanced option, a contrasting shape, and an
era-aware/wildcard option when valid.

One separately persisted `FORMATION RESPIN ×1` can replace all four after an
accessible confirmation. The deterministic replacement depends on seed, era,
manager, original offer index, respin index, and original four ids; it excludes
the original shapes whenever enough alternatives exist. After use it reads
`FORMATION RESPIN USED`, cannot be used again, and never changes either player
respin.

## Manager respin

Classic Draft and World Cup Run begin with one separately persisted Manager
Respin. It is available only before a manager is selected, permanently replaces
the current three-card set, and never changes either formation or player respin
counter. Selecting a manager hides the respin behind `MANAGER LOCKED`; advancing
to formation locks that manager for the run. Refresh and browser history never
restore a consumed respin.

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

Every session starts with exactly two player respins. A respin replaces all five
cards in the current starter or bench draw, preserves the phase and round, clears
the transient player preview, permanently consumes one use, persists after
refresh, and rejects the five displayed identities when enough alternatives
remain. Feasibility and identity rules are rechecked. A third use is ignored.
Manager, formation, era, and opponent selection cannot consume player respins.

## Free Selection

Free Selection exposes searchable player and manager archives, every formation,
every match environment, the 14 champions, and World Cup All-Stars. Card clicks
still open Position Fit before a starter placement can commit. Squad completion
requires 11 valid formation assignments, three ordered substitutes, 14 unique
identities, and no opponent-lineup conflict. Randomize Squad additionally
guarantees a valid starting goalkeeper and broad outfield coverage without
requiring a backup goalkeeper; individual picks can then be replaced.

## World Cup Run

World Cup Run creates eight four-team groups and a seeded knockout bracket.
Every team plays three group fixtures. Wins award three points, draws one, and
losses zero; standings rank by points, goal difference, goals scored, then a
seeded deterministic tiebreaker. Group matches may end level. The top two teams
advance into a seeded Round of 16, with immediate group rematches avoided where
possible, followed by quarterfinals, semifinals, and the final. Knockout ties use
extra time and penalties. Standings, bracket, current stage, qualification,
history, and the next fixture persist after every match; the run can be resumed
or restarted.

## Ratings and deterministic simulation

Pre-match ratings include attack, midfield, defense, goalkeeper contribution,
bench depth, bench versatility, the committed placement penalties, Position Fit,
Era Fit, timelessness, chemistry, tactical balance, manager OFF/DEF, and overall.
Bench 1/2/3 contribute with approximately 40%/25%/15% priority weights and remain
subordinate to starter quality.

Simulation priority is:

1. tournament-specific player quality
2. positional fit
3. tactical balance
4. chemistry
5. manager OFF/DEF
6. bidirectional Era Translation
7. ordered bench and substitutions
8. tournament experience
9. capped verified achievements
10. bounded seeded randomness

Knockout ties after 90 minutes go to extra time and then a deterministic
shootout. The
result includes goals, assists, cards, manager events, substitutions, minutes,
possession, shots, xG, tactical impact, and player of the match.

## Historical opponents

Normal opponent selection contains World Cup All-Stars plus exactly 14 champions,
newest first from Argentina 2022 through Brazil 1970. Each champion has its real
tournament manager, verified final XI, available substitute pool, player
positions, historical formation label, team ratings, tactical profile, era, and
one champion fact. The roster drives simulation scorers, cards, and substitutions.
Selection remains identity-safe: a champion cannot be selected when its roster
shares a player identity with the user's squad.

World Cup All-Stars remains an original featured Mythic challenge. Its bounded
rating modifier never forces a score or outcome; it uses the ordinary seeded
engine, Position Fit, Era Translation, substitutions, and match events.

The separate 416-team research archive is not exposed in normal opponent
selection. It supplies identity-safe historical teams for the randomized World
Cup Run field.

Flags accompany players, managers, champion tiles, opponent cards, selection,
match, and result surfaces. Historical names remain faithful to their tournament
context. Defunct country codes use a neutral archival diamond rather than a
misleading modern flag; West Germany keeps its historical display name while its
stored country code retains the documented Germany flag policy.

Champion status does not add a hidden result modifier.
