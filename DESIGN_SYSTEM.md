# Trophy XI design system

## Brand direction

Trophy XI is a grand football archive entering a night stadium: ceremonial,
competitive, regal, and exact. The visual language references the drama of
mid-2010s football-game menus—black lacquer, antique gold, stadium light, foil,
and jewel-tone era accents—without copying a protected interface, card silhouette,
logo, or brand asset.

## Color and atmosphere

- Canvas black `#050706`
- Royal panel black `rgba(13,13,10,.92)`
- Trophy gold `#CBA64A`
- Bright gold `#F2D77D`
- Deep gold `#715018`
- Pitch green `#1B5E45`
- Warm white `#F4F0E6`
- Muted text `#A8B2AA`

Gold defines hierarchy, edges, and ceremonial moments rather than filling whole
screens. Era themes control a single accent/glow token:

- All Eras: antique gold
- Turn of the Century: amber
- Modern Masters: royal violet
- New Generation: cool cyan

The generated stadium matte is a low-contrast backdrop, never an information
surface.

## Typography and geometry

Sora is the display face, Inter is body copy, and JetBrains Mono is metadata.
Headings use tight leading and negative tracking. Metadata is uppercase, spaced,
and small.

Collectible cards use clipped double borders, gilded rules, restrained foil glow,
and tall transparent subjects. Licensed photographs and illustrated fallbacks are
visually labeled by metadata, not disguised. Manager cards carry a ceremonial
portrait halo; player cards prioritize rating, tournament, role, subject, identity,
six attributes, and fit.

## Motion and effects

Controls transition in 150–220ms; hover lift stays under 7px. Card foil sweeps,
stadium particles, pitch-node glow, drawer movement, reveal timing, and match
events form the motion hierarchy. Effects must not obscure text or trap input.
`prefers-reduced-motion` removes transform/animation duration and match reveal
delays are skippable.

## Responsive and accessible behavior

- 390px: one-column flow, 44px minimum interactive controls, full-width dialogs
- 768px: compact grids and readable pitch/card stacking
- 1440px: pitch and three player choices share one view

Never rely on hover for required information. Preserve focus visibility, semantic
headings, live-region status, modal naming, keyboard activation, readable
contrast, and no horizontal page overflow.
