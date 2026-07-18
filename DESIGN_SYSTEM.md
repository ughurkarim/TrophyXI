# Trophy XI design system

## Brand direction

Trophy XI is a grand football archive entering a night stadium: ceremonial,
competitive, regal, and exact. Black lacquer, antique gold, stadium light, foil,
and era accents create the atmosphere without copying a protected game interface,
card silhouette, logo, or brand asset.

## Color, type, and geometry

- Canvas black `#050706`
- Royal panel black `rgba(13,13,10,.92)`
- Trophy gold `#CBA64A`
- Bright gold `#F2D77D`
- Deep gold `#715018`
- Pitch green `#1B5E45`
- Warm white `#F4F0E6`
- Muted text `#A8B2AA`

Sora is display, Inter is body, and JetBrains Mono is metadata. Gold defines
hierarchy and ceremonial edges rather than filling entire screens. Cards use
original rounded/clipped geometry, double rules, restrained foil, and explicit
image-context labels.

## Stable landing-card interaction

The landing showcase owns one motion layer for x, y, rotateX, and rotateY. Pointer
input is normalized from the fixed showcase bounds, clamped to ±8px x, ±6px y,
±3.5° rotateX, and ±4° rotateY, then damped by one spring. Values are absolute,
never accumulated. Pointer exit and blur return all values to zero.

CSS never animates those same transform properties. Base card fan rotation stays
within ±3°. Hover elevation does not alter document flow. Touch and pen input do
not run parallax. Keyboard focus uses border/glow only. Reduced motion removes
tilt, parallax, scale, and transition travel.

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
transparent PNG master inside a circular overflow mask, with:

- a dark outer ring and thin gold inner ring
- a separate era-colored rim/glow layer
- stable aspect ratio and crop-focus metadata
- `object-fit: contain`, consistent eye-line, and no stretching
- accessible alt text that identifies exact-tournament photo, licensed
  national-team photo, other licensed international photo, or illustrated fallback

The circle is not baked into the master. Cards may apply a maximum 1.03 scale to
the mask, soft rim light, and selected confirmation ring. No pulsing, flashing,
large zoom, rapid rotation, or face-obscuring effect is permitted.

Managers use the same portrait primitive and show OFF, DEF, leadership, and game
management. Nearby-year images can never be labeled exact tournament.

## Feature surfaces

- Formation offers: four cards, each with diagram, tendencies, manager fit,
  environment suitability, and tactical difficulty. The separate respin uses a
  restrained refresh-icon turn and replaces the grid only after the named
  confirmation dialog; the reduced-motion version changes content immediately.
- Player draft: five equal cards on desktop and a contained snap rail on mobile.
  A selected card gains a bright outline and slight inner elevation while the
  other four dim. Selection never moves or commits a tactical node.
- Position Fit: green is strong/natural, yellow is adaptable, red is awkward/bad,
  and muted is incompatible. Every open node repeats the state with a fit
  percentage, text label, and exact penalty; feasibility-blocked is a distinct
  labeled disabled state. Color is never the only signal.
- Player placement: the selected summary and projected metrics stay visible while
  slots are evaluated. Commit uses a short opacity/vertical feedback reveal
  outside the stable node transform. Reduced motion removes translation and
  transition duration while retaining the status announcement and full feedback.
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

## Responsive and accessible behavior

- 390px: single-column flow, 44px controls, one opponent card per row, a
  horizontally snapping five-card rail, and a sticky selected-player summary
- 768px: compact grids and readable pitch/card stacking
- 1440px: tactical pitch and five player choices share one balanced view

No surface may create horizontal page overflow. Circular portraits cannot clip;
tactical nodes remain usable; fit and penalty labels cannot overlap; dialogs are
named; status changes use live regions. Preserve semantic landmarks, focus
visibility, keyboard activation, reduced motion, hydration notices, readable
contrast, and mobile tap targets. In reduced-motion mode card entrances, selected
elevation, placement feedback travel, respin rotation, and ceremonial reveal
travel are disabled without removing content or focus feedback.
