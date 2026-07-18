# Trophy XI design system

## Brand direction

Trophy XI is a grand football archive entering a night stadium: ceremonial,
competitive, regal, and exact. Black lacquer, antique gold, stadium light, foil,
and era accents create an original Trophy XI atmosphere and interface.

## Color, type, and geometry

- Canvas black `#050505`
- Deep black `#080808`
- Royal panel black `#101010`
- Raised/selected black `#141414` / `#181818`
- Trophy gold `#D4B34F`
- Bright gold `#EDD374`
- Deep gold `#7D681A`
- Regal purple `#A275EE`
- Cyan `#58BDEB`
- Teal `#37D2BE`
- Orange `#F18B42`
- Pink `#EA66A8`
- Blue `#4E92DE`
- Pitch green `#1B5E45`
- Warm white `#F2F0E9`
- Muted text `#A6A6A2`

Sora is display, Inter is body, and JetBrains Mono is metadata. Gold defines
hierarchy and ceremonial edges rather than filling entire screens. Cards use
original rounded/clipped geometry, double rules, restrained foil, and explicit
image-context labels.

## Stable landing-card interaction

The landing showcase is a pinned Ronaldo/Messi archive. Vertical progress scrubs
both card ids through 2026, 2022, 2018, 2014, 2010, and 2006, then the sticky
stage releases into ordinary document scrolling. Messi stays left and Ronaldo
stays right. Pelé is not part of this showcase.

One Framer Motion wrapper per card owns only transition opacity, vertical travel,
and blur. The nested static card owns its restrained ±2° base rotation, so two
animation systems never control the same transform property. Decorative cards
do not capture pointer events. Keyboard focus uses border/glow only. Reduced
motion collapses the long scroll scene, shows the 2026 pair, removes transition
travel, and preserves immediate access to the rest of the page.

## Stable formation nodes

One `.pitch` containing block owns all percentage coordinates. Each node wrapper:

- is absolutely positioned by left/top
- has a fixed width/height and `box-sizing: border-box`
- always uses only `translate(-50%, -50%)` for centering
- never changes border width, padding, coordinates, or translation by state

Hover/selected scale applies only to the centered inner disc. Focus uses
box-shadow. Labels are absolutely positioned and cannot push the wrapper. Empty,
filled, selected, pressed, focused, disabled, compact, mobile, and desktop nodes
retain the same center and dimensions.

## Circular portraits

`CircularPortrait` supports 64, 96, 128, and 160px sizes. It renders a reusable
transparent PNG master or non-face Photo Pending identity marker inside a
circular overflow mask, with:

- a dark outer ring and thin gold inner ring
- a separate era-colored rim/glow layer
- a status-tier rim that follows the player’s modeled archive tier
- stable 1:1 aspect ratio with equal rendered width and height
- `object-fit: cover`, `object-position: center top`, and no stretching
- accessible alt text that identifies exact-year or Photo Pending context

The circle is not baked into the master. Cards may apply a maximum 1.03 scale to
the mask, soft rim light, and selected confirmation ring. No pulsing, flashing,
large zoom, rapid rotation, or face-obscuring effect is permitted.

Photo Pending markers use initials, flag, tournament year, and the same tier
ring. They never depict or imply a face. Managers use the same portrait
primitive and show OFF, DEF, leadership, and game management. Every displayed
face image is local, permissioned, and exact-year. Nearby-year and identity-only
images never render. The generated manifest is importer-owned. Permissioned
EA/SoFIFA faces retain their original metadata, watermarks, cache records, and
required attribution. Each World Cup card uses the edition available by June of
its tournament year, never the following season's edition.

## Status-tier language

Normal player cards use seven modeled status tiers. The tier changes the rim,
selected underline, detail ambient light, and rating surface without changing the
card silhouette:

- legend — trophy gold
- icon — pale violet
- elite — regal violet
- standout — teal
- reliable — blue
- role-player — orange
- limited — silver

Tier treatment must remain readable in text and cannot rely on color alone.
Ratings and tiers are game estimates, not historical honors.

## Feature surfaces

- Database: a dedicated header route presents every draftable tournament card
  with search, nation/year/position/rating/tier/era/photo filters, four sort
  orders, bounded scrolling, incremental rendering, and the full player record.
- Manager selection: three identity-safe cards and one permanent deterministic
  Manager Respin. It excludes original identities when alternatives exist and
  never consumes the separate Formation Respin or two Player Respins.
- Formation offers: four cards, each with diagram, tendencies, manager fit,
  environment suitability, and tactical difficulty. The separate respin uses a
  restrained refresh-icon turn and replaces the grid only after the named
  confirmation dialog; the reduced-motion version changes content immediately.
- Player draft: five equal cards on desktop and a contained snap rail on mobile.
  A selected card gains a complete rarity-colored border, tint, header/rating
  accent, portrait ring, and glow without moving or resizing; the other four
  dim. The selected-player dossier exposes best-position fit, projected Chemistry
  and OVR, sourced career/tournament accolades, gameplay tag effects, and a
  compact cancel control.
- Squad archive: one compact strip holds the manager, all eleven fixed formation
  positions, and Bench 1/2/3. Filled chips use circular faces, short names, slot,
  flag, and rating; every filled chip opens its record. At small widths the strip
  scrolls internally without widening the page.
- Position Fit: green is strong/natural, yellow is adaptable, red is awkward/bad,
  and muted is incompatible. Every open node repeats the state with a fit
  percentage, text label, and exact penalty; feasibility-blocked is a distinct
  labeled disabled state. Color is never the only signal.
- Player placement: the selected summary and projected metrics stay visible while
  slots are evaluated. Commit uses a short opacity/vertical feedback reveal
  outside the stable node transform. Reduced motion removes translation and
  transition duration while retaining the status announcement and full feedback.
- Chemistry HUD: fixed at the tactical-panel top right. With no selection it
  shows committed Chemistry. With a selection it shows current, projected,
  signed change, and projected OVR. Pointer hover or keyboard focus switches it
  from best-available to exact-slot production calculation. Fit glows use only
  outline and shadow, never position or transform.
- Player records: tier-aware rating hero, tournament versions, nullable record,
  squad-specific fit, a separate modeled Player Tag Effects section, sourced
  career accolades, and item-level portrait attribution. At most six accolade
  rows stagger by 70ms; overflow becomes a static “More Honors” row.
- Manager records: real circular face, nation/team flags, tournament version,
  OFF/DEF/leadership/game management, tactical strengths and weaknesses, modeled
  tags, sourced accolades, archive versions, and portrait attribution.
- Bench: compact circular portraits, numbered priority, expected-minutes guidance,
  keyboard-accessible up/down controls as the primary reordering mechanism, and
  the same five-card option layout used by starter rounds
- Opponents: dense paginated cards with nation, year, finish, ratings, formation
  model, Era Translation, and difficulty. Champions receive a small original
  crown marker rather than an organizer trophy. World Cup All-Stars receives a
  distinct Mythic seal, featured spacing, and composite-manager disclosure;
  selected outline and check remain separate states.
- Match/result: substitution events use the same hierarchy as goals without
  flashing; all fourteen player-minute records remain readable
- Playable World Cup All-Stars: the curated Mythic manager, starting XI, and
  ordered Bench 1/2/3 load after environment selection. The squad dossier opens
  the same rating, accolade, tag, position-fit, manager-fit, and translation
  records, then uses ordinary opponent selection and deterministic simulation.

## Responsive and accessible behavior

- 390px: single-column flow, 44px controls, one opponent card per row, a
  horizontally snapping five-card rail, internally scrolling squad archive, and
  a sticky selected-player summary
- 768px: compact grids and readable pitch/card stacking
- 1440px: tactical pitch and five player choices share one balanced view

No surface may create horizontal page overflow. Circular portraits cannot clip;
tactical nodes remain usable; fit and penalty labels cannot overlap; dialogs are
named; status changes use live regions. Preserve semantic landmarks, focus
visibility, keyboard activation, reduced motion, hydration notices, readable
contrast, and mobile tap targets. In reduced-motion mode card entrances, selected
elevation, placement feedback travel, respin rotation, and ceremonial reveal
travel are disabled without removing content or focus feedback.
