# Trophy XI image sources

## Current build report

- 338 local transparent 700×900 PNG masters
- 4 licensed exact-tournament photographs
- 4 national-team-kit photographs
- 0 nearby-year photographs
- 334 intentional original illustrated fallbacks
- 310 player assets and 28 manager assets
- zero runtime hotlinks

The executable report is `npm run validate:data`. Public item-level attribution is
available at `/credits`; the typed manifest is `src/data/player-images.ts`.

## Required portrait metadata

Every portrait record stores local PNG path, preserved source file when licensed,
source page, author, license and URL, attribution/change text, represented team,
photographed year, exact-tournament flag, national-team-kit flag, and crop focus.

Source priority is exact tournament national team, same-year national team,
nearby-year national team, another licensed international image, then an honestly
labeled original fallback. A nearby-year photograph can never set
`exactTournamentImage: true`. Club kits are not altered, fake historical kits are
not generated, and editorial/watermarked/unlicensed images are not used.

## Circular crop review

Masters remain transparent rectangular canvases; the interface applies the circle.
Review each image at 64, 96, 128, and 160px for forehead/chin clearance, eye-line,
stretching, white halos, rectangular source remnants, and national-kit context.
`cropFocus` must remain within 0–100. Validation requires PNG format, an alpha
channel, actual transparent pixels, local presence, and complete metadata.

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

## Fallback and import workflow

When no suitable reusable image can be verified and isolated cleanly, Trophy XI
uses an original transparent illustration. Cards say `ILLUSTRATED`, the manifest
sets `fallback: true`, and credits call it original project artwork. Fallbacks do
not imitate a real face or claim a national kit.

1. Add full metadata to `src/data/player-images.ts`.
2. Preserve/download the source through `scripts/player-image-sources.json`.
3. Supply a reviewed alpha mask or isolated derivative.
4. Run `npm run images:import`.
5. Run `npm run validate:data`.
6. Inspect all circular sizes and confirm `/credits` context labels.

The importer rejects missing licensed sources, masks/derivatives, license fields,
non-alpha output, and non-700×900 masters.
