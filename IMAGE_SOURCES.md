# Trophy XI image sources

## Current build report

- 268 local transparent 700×900 PNG masters
- 1 licensed tournament photograph
- 267 intentional original illustrated fallbacks
- 240 player assets and 28 manager assets
- zero runtime hotlinks

The executable report is `npm run validate:data`. Public item-level attribution is
available at `/credits`, and the typed manifest is
`src/data/player-images.ts`.

## Licensed source

### Luka Modrić — Croatia 2018

- Card: `luka-modric-2018`
- Source page: https://commons.wikimedia.org/wiki/File:Luka_Modric_2018.png
- Author: Антон Зайцев
- License: Creative Commons Attribution-ShareAlike 3.0 Unported
- License: https://creativecommons.org/licenses/by-sa/3.0/
- Preserved original: `public/players/sources/luka-modric-2018.png`
- Reviewed isolated derivative: `public/players/isolated/luka-modric-2018.png`
- Changes: background isolation via reviewed chroma-key derivative, edge
  contraction, transparent crop, and resize to the 700×900 master

## Fallback policy

When an exact-tournament, freely reusable image with verifiable metadata is not
available or cannot be isolated cleanly, Trophy XI uses an original transparent
illustration. The card says `ILLUSTRATED`, the manifest sets `fallback: true`, and
credits call it original project artwork. Fallbacks do not imitate a real face.

## Import workflow

1. Add complete source and license metadata to `src/data/player-images.ts`.
2. Preserve/download the source through `scripts/player-image-sources.json`.
3. Supply a reviewed alpha mask or reviewed isolated derivative.
4. Run `npm run images:import`.
5. Run `npm run validate:data`.
6. Inspect the master at card size and update `/credits` through the manifest.

The importer rejects missing sources, masks/isolated derivatives, license fields,
non-alpha output, and non-700×900 masters.
