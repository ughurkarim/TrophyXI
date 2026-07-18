# Trophy XI image sources

## Current active build report

- 61 local transparent 700×900 PNG masters
- 51 draft-eligible player photographs
- 10 draft-eligible manager photographs
- 4 verified exact-tournament national-team photographs
- 57 conservatively labeled licensed identity photographs
- 0 active artwork assets
- 0 runtime hotlinks

The remaining 259 player and 18 manager records are research-only. They retain
typed history but do not enter offers and do not keep production portrait files.

The executable report is `npm run validate:data`. Public item-level attribution is
available at `/credits`; the typed manifest is `src/data/player-images.ts`.

## Required portrait metadata

Every active portrait record stores local PNG path, preserved source file,
source page, author, license and URL, attribution/change text, represented team,
photographed year, exact-tournament flag, national-team-kit flag, and crop focus.

Source priority is exact tournament national team, same-year national team,
nearby-year national team, then another reusable licensed face photograph. If the
source supports identity only, the manifest records `other-licensed-face`; it
does not claim a team, kit, tournament, or photographed year that the source does
not establish. A nearby-year or identity-only photograph can never set
`exactTournamentImage: true`. Club kits are not altered, fake historical kits are
not generated, and editorial, watermarked, or unlicensed images are not used.

## Circular crop review

Masters remain transparent rectangular canvases; the interface applies the circle.
Review each image at 64, 96, 128, and 160px for forehead/chin clearance, eye-line,
stretching, white halos, rectangular source remnants, and national-kit context.
`cropFocus` must remain within 0–100. Validation requires PNG format, an alpha
channel, actual transparent pixels, local presence, and complete metadata.
`npm run images:contact` writes the active face contact sheet used for this review.

## Licensed exact-tournament sources

### Ivan Perišić — Croatia 2018

- Source: https://commons.wikimedia.org/wiki/File:Ivan_Peri%C5%A1i%C4%87.jpg
- Author: Антон Зайцев
- License: CC BY-SA 3.0
- Preserved source: `public/players/sources/ivan-perisic-2018.jpg`
- Reviewed derivative: `public/players/isolated/ivan-perisic-2018.png`

### Kylian Mbappé — France 2018

- Source: https://commons.wikimedia.org/wiki/File:Kylian_Mbapp%C3%A9_2018.jpg
- Author: Антон Зайцев
- License: CC BY-SA 3.0
- Preserved source: `public/players/sources/kylian-mbappe-2018.jpg`
- Reviewed derivative: `public/players/isolated/kylian-mbappe-2018.png`

### Luka Modrić — Croatia 2018

- Source: https://commons.wikimedia.org/wiki/File:Luka_Modric_2018.png
- Author: Антон Зайцев
- License: CC BY-SA 3.0
- Preserved source: `public/players/sources/luka-modric-2018.png`
- Reviewed derivative: `public/players/isolated/luka-modric-2018.png`

### Thibaut Courtois — Belgium 2018

- Source: https://commons.wikimedia.org/wiki/File:Courtois_2018_(cropped).jpg
- Author: Кирилл Венедиктов
- License: CC BY-SA 3.0
- Preserved source: `public/players/sources/thibaut-courtois-2018.jpg`
- Reviewed derivative: `public/players/isolated/thibaut-courtois-2018.png`

Each derivative uses reviewed background isolation, edge contraction, transparent
crop, and resize to the 700×900 master. Full license URLs and modification text
remain in the typed manifest and credits.

## Licensed import workflow

1. Mark the player or manager draft-eligible only after a reusable image is found.
2. Record the canonical Commons/Wikipedia source, author, license, license URL,
   date when stated, and conservative photo context.
3. Run `tsx scripts/sync-licensed-portrait-sources.ts` when source metadata needs
   refreshing; review `scripts/licensed-portrait-sources.generated.json`.
4. Run `npm run images:import` to preserve the source and create a mechanical
   face-centered, transparent 700×900 derivative.
5. Run `npm run images:contact` and inspect all circular sizes.
6. Run `npm run validate:data` and confirm `/credits` labels and links.

The importer rejects missing sources, unsupported licenses, incomplete metadata,
non-alpha output, and non-700×900 masters. Validation also rejects an active
manifest/file mismatch, an inactive production PNG, or unsupported tournament
context.
