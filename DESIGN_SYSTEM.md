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
  environment suitability, and tactical difficulty
- Bench: compact circular portraits, numbered priority, expected-minutes guidance,
  and keyboard-accessible up/down controls as the primary reordering mechanism
- Opponents: dense paginated cards with nation, year, finish, ratings, formation
  model, Era Translation, and difficulty
- Match/result: substitution events use the same hierarchy as goals without
  flashing; all fourteen player-minute records remain readable

## Responsive and accessible behavior

- 390px: single-column flow, 44px controls, one opponent card per row
- 768px: compact grids and readable pitch/card stacking
- 1440px: tactical pitch and three player choices share one view

No surface may create horizontal page overflow. Circular portraits cannot clip;
tactical nodes remain usable; dialogs are named; status changes use live regions.
Preserve semantic landmarks, focus visibility, keyboard activation, reduced
motion, hydration notices, readable contrast, and mobile tap targets.
