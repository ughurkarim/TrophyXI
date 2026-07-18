# Trophy XI game rules

## Session flow

Choose one of four era modes, draft one of exactly three tournament-manager
versions, choose a formation, and fill eleven formation slots. Before every player
draw, the user must select any open pitch position. A selected empty position can
be cancelled; a filled position can be inspected but never replaced.

Era modes are:

- All Eras (`1998–2022`)
- Turn of the Century (`1998–2006`)
- Modern Masters (`2010–2018`)
- New Generation (`2022`)

All Eras gives every eligible card 100 era fit. Era-specific pools are strict, so
their available cards also receive 100 era fit.

## Identity integrity

Every card has a version id and a separate stable `playerIdentityId`. Multiple
tournament versions may exist in the archive, but one identity can appear only
once in the user XI. All Spain 2010 opponent identities are excluded from player
options.

Identity, slot, era, and position rules run during initialization, option
generation, selection, hydration/migration, pre-match validation, and simulation
input. A corrupt or old save is repaired where possible; removed data is announced
in an accessible notice.

## Position fit

Valid draft options use a 0–100 fit scale:

- 100: exact primary position
- 94: strong role-family fit
- 88: declared secondary position
- 80: adjacent accepted role
- 68: emergency accepted role
- 0: invalid and never drafted

## Manager fit

Managers have an era, tactical style, preferred formations, and modest
attack/midfield/defense/clutch modifiers. Formation preference, style
compatibility, and selected era produce a 75–100 manager-fit score. Manager
effects are intentionally smaller than player quality.

## Respin

One permanent respin exists per session. It may dismiss all three manager options
or all three cards in any one player round. The user must confirm. Rejected
identity ids cannot return, and the new draw is deterministic from the original
seed, stage, slot, pick index, and respin index.

## Team ratings and chemistry

Attack uses the four strongest attacking contributions. Midfield uses the five
strongest control/creativity/physical contributions. Defense blends the four
strongest outfield defenders with goalkeeping. Formation and manager modifiers
remain modest.

Chemistry uses country, tournament year, historical era, confederation,
archetype, position fit, era fit, manager fit, and completion. Named achievement
effects use diminishing returns and a hard 1.5-point team cap. Overall remains
34% attack, 33% midfield, and 33% defense with bounded chemistry/fit adjustments.

## Simulation

The local engine compares attack versus defense, midfield control, chemistry,
formation, manager fit, sourced achievement effects, and clutch. A seeded
pseudo-random generator adds bounded variation. The same validated input and seed
produce the same event sequence and result.

Ties after 90 minutes go to extra time and then a deterministic shootout. The
single result object contains goals, assists, cards, manager interventions,
possession, shots, xG, tactical impact, player of the match, and the full timeline.
